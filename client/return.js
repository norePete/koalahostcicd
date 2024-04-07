document.addEventListener('DOMContentLoaded', async () => {
const container = document.getElementById('secretContainer');
const button = document.createElement('button');
button.textContent = 'reveal secret key';
async function buttonClickHandler(e) {
    e.preventDefault();
    const retrievedString = localStorage.getItem("paymentIntentId");
          const transientWallet = await fetch('/gateway/payment-confirmation', {
            method: 'POST', // Specify the HTTP method as POST
            headers: {
            'Content-Type': 'application/json' // Set the content type header
            },
            body: JSON.stringify({paymentIntentId : retrievedString}) // Optional payload. Modify this if you need to send data in the request body
            }).then((r) => r.json());
      const a = transientWallet.Uint8;
      const b = Object.values(a);

      const newListItem = document.createElement("li");
      const textNode = document.createTextNode(`[${Object.values(a)}]`);
      newListItem.appendChild(textNode);
      const placeholderNode = document.getElementById("output");
      placeholderNode.appendChild(newListItem);
}

button.addEventListener('click', buttonClickHandler);
container.appendChild(button);

// Load the publishable key from the server. The publishable key
// is set in your .env file.
const {publishableKey} = await fetch('/gateway/config').then((r) => r.json());
if (!publishableKey) {
    addMessage(
    'No publishable key returned from the server. Please check `.env` and try again'
    );
    alert('Please set your Stripe publishable API key in the .env file');
}

const stripe = Stripe(publishableKey, {
    apiVersion: '2020-08-27',
});

const url = new URL(window.location);
const clientSecret = url.searchParams.get('payment_intent_client_secret');
const {error, paymentIntent} = await stripe.retrievePaymentIntent(clientSecret);
if (error) {
    addMessage(error.message);
}
addMessage(`Payment ${paymentIntent.status}: ${paymentIntent.id}`);
localStorage.setItem("paymentIntentId", paymentIntent.id);
});
