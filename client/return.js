document.addEventListener('DOMContentLoaded', async () => {
const secretButton = document.getElementById('secretButton');
localStorage.setItem("sk_wallet", '');

async function buttonClickHandler(e) {
    e.preventDefault();
    let key = "ERROR";
    const retrievedString = localStorage.getItem("paymentIntentId");

    const storedKey = localStorage.getItem("sk_wallet");
    if (storedKey !== null && storedKey.length > 0) {
        key = storedKey;
    } else {
      try {
        const transientWallet = await fetch('/gateway/payment-confirmation', {
          method: 'POST', // Specify the HTTP method as POST
          headers: {
          'Content-Type': 'application/json' // Set the content type header
          },
          body: JSON.stringify({paymentIntentId : retrievedString}) // Optional payload. Modify this if you need to send data in the request body
          }).then((r) => r.json());
        const keyObject = transientWallet.Uint8;
        key = `[${Object.values(keyObject)}]`;
      } catch (err) {
          alert('there was an error, please try again');
      }

    }
    navigator.clipboard.writeText(key);
    localStorage.setItem("sk_wallet", key);
    alert('secret key copied to clipboard');
    const textArea = document.getElementById("output");
    textArea.value = '';
    textArea.value = key;
}

secretButton.addEventListener('click', buttonClickHandler);

// Load the publishable key from the server. The publishable key
// is set in your .env file.
const {publishableKey} = await fetch('/gateway/config').then((r) => r.json());
if (!publishableKey) {
    alert('Please set your Stripe publishable API key in the .env file');
}

const stripe = Stripe(publishableKey, {
    apiVersion: '2020-08-27',
});

const url = new URL(window.location);
const clientSecret = url.searchParams.get('payment_intent_client_secret');
const {error, paymentIntent} = await stripe.retrievePaymentIntent(clientSecret);

if (error) {
    alert(error.message);
}

localStorage.setItem("paymentIntentId", paymentIntent.id);

});
