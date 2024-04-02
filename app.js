const {
  clusterApiUrl,
  Connection,
  Keypair,
  Transaction,
  SystemProgram,
  PublicKey,
} = require("@solana/web3.js");

const {
  createInitializeMintInstruction,
  TOKEN_PROGRAM_ID,
  MINT_SIZE,
  getMinimumBalanceForRentExemptMint,
  createMint,
  createAssociatedTokenAccount,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
  getMint,
  createAssociatedTokenAccountIdempotent,
  mintToChecked,
} = require("@solana/spl-token");

const bs58 = require("bs58");
const base = require('base-x');
const BN = require('bn.js');


const express = require('express');
const gpg = require('gpg');
const app = express();
const {resolve} = require('path');
// Replace if using a different env file or config
const env = require('dotenv').config({path: './.env'});
const openpgp = require('openpgp'); // use as CommonJS, AMD, ES6 module or via window.openpgp

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2020-08-27',
  appInfo: { // For sample support and debugging, not required for production:
    name: "stripe-samples/accept-a-payment/payment-element",
    version: "0.0.2",
    url: "https://github.com/stripe-samples"
  }
});

app.use(express.static(process.env.STATIC_DIR));
app.use(
  express.json({
    // We need the raw body to verify webhook signatures.
    // Let's compute it only when hitting the Stripe webhook endpoint.
    verify: function (req, res, buf) {
      if (req.originalUrl.startsWith('/webhook')) {
        req.rawBody = buf.toString();
      }
    },
  })
);

const cached_secrets = {
    publicKey: '',
    privateKey: '',
}

    /*
    * Util Functions
    */

async function setup_public(publicKeyArmored) {
    const publicKey = await openpgp.readKey({ armoredKey: publicKeyArmored });
    return publicKey;
}

async function setup_private(privateKeyArmored, passphrase) {
    const privateKey = await openpgp.decryptKey({
        privateKey: await openpgp.readPrivateKey({ armoredKey: privateKeyArmored }),
        passphrase
    });
    return privateKey;
}

async function encryptPGP(clear_text, publicKey, privateKey) {
    const encrypted = await openpgp.encrypt({
        message: await openpgp.createMessage({ text: clear_text }), // input as Message object
        encryptionKeys: publicKey,
        signingKeys: privateKey // optional
    });
    return encrypted;
}

async function decryptPGP(encrypted, publicKey, privateKey) {
    const message = await openpgp.readMessage({
        armoredMessage: encrypted // parse armored message
    });

    const { data: decrypted, signatures } = await openpgp.decrypt({
        message,
        verificationKeys: publicKey, // optional
        decryptionKeys: privateKey
    });
    // check signature validity (signed messages only)
    try {
        await signatures[0].verified; // throws on invalid signature
        console.log('Signature is valid');
    } catch (e) {
        throw new Error('Signature could not be verified: ' + e.message);
    }
    return decrypted;
}

    /*
    * Mint Utils
    */


    /*
    * Routes 
    */

app.get('/', (req, res) => {
  const path = resolve(process.env.STATIC_DIR + '/index.html');
  res.sendFile(path);
});

app.get('/config', (req, res) => {
  res.send({
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
  });
});

app.get('/create-payment-intent', async (req, res) => {
  // Create a PaymentIntent with the amount, currency, and a payment method type.
  //
  // See the documentation [0] for the full list of supported parameters.
  //
  // [0] https://stripe.com/docs/api/payment_intents/create
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      currency: 'NZD',
      amount: 50,
      automatic_payment_methods: { enabled: true }
    });
    res.send({
      clientSecret: paymentIntent.client_secret,
      receipt: '',
    });
  } catch (e) {
    return res.status(400).send({
      error: {
        message: e.message,
      },
    });
  }
});


app.post('/payment-confirmation', async (req, res) => {
    try {
        return res.status(200).send({
          bs58: '',
          Uint8: '',
        });
    } catch (e) {
        console.error('Error confirming PaymentIntent:', e);
        return res.status(500).send({
            error: {
              message: e.message,
            }
        });
    }
});


// Expose a endpoint as a webhook handler for asynchronous events.
// Configure your webhook in the stripe developer dashboard
// https://dashboard.stripe.com/test/webhooks
app.post('/webhook', async (req, res) => {
  let data, eventType;

  // Check if webhook signing is configured.
  if (process.env.STRIPE_WEBHOOK_SECRET) {
    // Retrieve the event by verifying the signature using the raw body and secret.
    let event;
    let signature = req.headers['stripe-signature'];
    try {
      event = stripe.webhooks.constructEvent(
        req.rawBody,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.log(`⚠️  Webhook signature verification failed.`);
      return res.sendStatus(400);
    }
    data = event.data;
    eventType = event.type;
  } else {
    // Webhook signing is recommended, but if the secret is not configured in `config.js`,
    // we can retrieve the event data directly from the request body.
    data = req.body.data;
    eventType = req.body.type;
  }

  if (eventType === 'payment_intent.succeeded') {
    // Funds have been captured
    // Fulfill any orders, e-mail receipts, etc
    // To cancel the payment after capture you will need to issue a Refund (https://stripe.com/docs/api/refunds)
    console.log('💰 Payment captured!');
  } else if (eventType === 'payment_intent.payment_failed') {
    console.log('❌ Payment failed.');
  }
  res.sendStatus(200);
});

app.listen(5566, () => { console.log('hello') });
