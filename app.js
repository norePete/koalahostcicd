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
const helmet = require('helmet');
const mysql = require('mysql');

const express = require('express');
const app = express();
const {resolve} = require('path');
// Replace if using a different env file or config
const env = require('dotenv').config({path: './.env'});
const base = require('base-x');
const bs58 = require("bs58");

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2020-08-27',
  appInfo: { // For sample support and debugging, not required for production:
    name: "stripe-samples/accept-a-payment/payment-element",
    version: "0.0.2",
    url: "https://github.com/stripe-samples"
  }
});
const db = mysql.createConnection({
  host: 'localhost',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

db.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL: ' + err.stack);
    return;
  }
  console.log('Connected to MySQL as id ' + connection.threadId);
});


let connection = new Connection(clusterApiUrl("devnet"), "confirmed");
const base58 = base('123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz');
const feePayer = Keypair.fromSecretKey(Uint8Array.from([77,205,6,48,157,94,45,229,126,26,123,21,33,67,154,155,167,105,140,92,98,4,101,62,92,17,42,81,81,172,199,42,48,158,59,197,44,59,197,246,149,151,163,237,200,252,252,243,100,240,37,205,212,141,200,197,113,145,145,17,247,230,221,5]));
const mintOwner = Keypair.fromSecretKey(Uint8Array.from([128,223,147,87,227,119,204,78,184,229,50,109,115,213,14,1,58,231,95,58,40,10,217,26,233,41,101,57,184,214,233,199,166,14,42,89,230,236,55,176,251,230,225,83,101,188,20,23,118,71,254,64,118,248,25,136,182,123,108,218,209,124,245,14]));
const nzdKeypair = Keypair.fromSecretKey(base58.decode(process.env.NZD_MINT));
const audKeypair = Keypair.fromSecretKey(base58.decode(process.env.AUD_MINT));
const eurKeypair = Keypair.fromSecretKey(base58.decode(process.env.EUR_MINT));
const usdKeypair = Keypair.fromSecretKey(base58.decode(process.env.USD_MINT));
const gbpKeypair = Keypair.fromSecretKey(base58.decode(process.env.GBP_MINT));


app.use(express.static(process.env.STATIC_DIR));
app.use(
    helmet({
        contentSecurityPolicy: false,
//    contentSecurityPolicy: {
//      directives: {
//        "script-src": ["'self'", "js.stripe.com", "stripe.com"],
//      },
//    },
}));
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

    /*
    * Mint Utils
    */
    async function generateWalletForCurrency(connection, feePayer, mint, owner) {
    const keypair = Keypair.generate();
    // const keypair = Keypair.fromSecretKey(Uint8Array.from([210,46,87,248,33,41,32,180,138,65,200,202,254,41,170,195,111,154,112,104,98,206,214,210,180,198,74,180,202,255,183,152,208,132,122,61,110,80,172,225,97,11,148,112,96,226,65,114,171,113,168,219,101,38,144,174,120,162,39,51,247,211,179,189]));
    let tokenAccount = undefined;
    let retry = 5;
    while (retry > 0 && tokenAccount === undefined) {
        try {
            const ata = await createAssociatedTokenAccountIdempotent(connection, feePayer, mint.publicKey, keypair.publicKey);
            tokenAccount = ata;
            console.log('ata created');
            retry = -1;
        } catch (e) {
            retry = retry -1;
            console.log('retrying', e);
        }
    }
    const transientTokenAccount = {
        root: keypair,
        ata: tokenAccount,
    };
    return transientTokenAccount;
}


async function getMintForCurrency(currency) {
    let requestedMint = undefined;
    if (currency === 'nzd') {
        requestedMint = nzdKeypair;
    } else if (currency === 'aud') {
        requestedMint = audKeypair;
    } else if (currency === 'eur') {
        requestedMint = eurKeypair;
    } else if (currency === 'usd') {
        requestedMint = usdKeypair;
    } else if (currency === 'gbp') {
        requestedMint = gbpKeypair;
    }
    return requestedMint;
}

async function mintCurrencyToWallet(connection, receiverPubkey, mintPubkey, feePayer, owner, amount) {
    let txhash = await mintToChecked(
      connection, // connection
      feePayer, // fee payer
      mintPubkey, // mint
      receiverPubkey, // receiver (should be a token account)
      owner, // mint authority
      amount * 1e6, // amount. if your decimals is 8, you mint 10^8 for 1 token.
      8 // decimals
    );
    return txhash;
}



    /*
    * Routes 
    */

app.get('/gateway', (req, res) => {
  const path = resolve(process.env.STATIC_DIR + '/index.html');
  res.sendFile(path);
});

app.get('/gateway/client/:filename', (req, res) => {
  const filename = req.params.filename;
  const filepath = resolve(process.env.STATIC_DIR + '/' + filename);
  res.sendFile(filepath);
});

app.get('/gateway/config', (req, res) => {
  res.send({
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
  });
});

app.get('/gateway/create-payment-intent', async (req, res) => {
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


app.post('/gateway/payment-confirmation', async (req, res) => {
    try {
        const paymentIntentId = req.body.paymentIntentId;
        const paymentStatus = await stripe.paymentIntents.retrieve(paymentIntentId);
        
        const amount_received = paymentStatus.amount_received;
        const status = paymentStatus.status;
        const currency = paymentStatus.currency;

        db.query(`SELECT * FROM test WHERE data = '${paymentIntentId}'`, (err, rows) => {
            if (err) {
                res.writeHead(500, {'Content-Type': 'text/plain'});
                return res.end('Error with transaction. Email help@1228247.xyz, please quote transaction id for a refund:', paymentIntentId);
            }
            if (status === 'success' && rows.length === 0) {
                // insert
                db.query(`INSERT INTO test (data) VALUES ('${paymentIntentId}')`, async (err, result) => {
                    if (err) {
                        res.writeHead(500, {'Content-Type': 'text/plain'});
                        return res.end('Error with transaction. Email help@1228247.xyz, please quote transaction id for a refund:', paymentIntentId);
                    }
                    const mint = await getMintForCurrency(currency);
                    const transientWallet = await generateWalletForCurrency(connection, feePayer, mint, mintOwner);
                    const tx = await mintCurrencyToWallet(connection, transientWallet.ata, mint.publicKey, feePayer, mintOwner, amount_received);
                    const secretUint8 = transientWallet.root._keypair.secretKey;
                    const secret = bs58.encode(secretUint8);
                    return res.status(200).send({
                      bs58: secret,
                      Uint8: secretUint8,
                    });
                });
            } else {
                return res.status(500).send({
                    error: {
                        message: `waiting for payment to be confirmed. status: ${status}, rows.length: ${rows.length}`,
                    }
                });
            }
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
app.post('/gateway/webhook', async (req, res) => {
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

app.get('/gateway/db', async (req, res) => {
    db.query("INSERT INTO test (data) VALUES ('octopus')", (err, result) => {
      if (err) {
          res.writeHead(500, {'Content-Type': 'text/plain'});
          return res.end('Error incrementing number in database');
      }
      // Fetch the updated number from the database
      let octopus = null;
      let unicorn = null;

      db.query("SELECT * FROM test WHERE data = 'octopus'", (err, rows_found) => {
          if (err) {
              res.writeHead(500, {'Content-Type': 'text/plain'});
              return res.end('Error fetching number from database');
          }
          octopus = rows_found.length;
          db.query("SELECT * FROM test WHERE data = 'unicorn'", (err, rows_missing) => {
              if (err) {
                  res.writeHead(500, {'Content-Type': 'text/plain'});
                  return res.end('Error fetching number from database');
              }
              unicorn = rows_missing.length;
              res.writeHead(200, {'Content-Type': 'text/plain'});
              res.end(`ocotpus should be found: ${octopus} | unicorn should be missing: ${unicorn}`);
          });
      });
  });
});

app.listen();
