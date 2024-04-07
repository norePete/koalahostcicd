document.addEventListener('DOMContentLoaded', async () => {
  // create payment intent
  const payButton = document.getElementById('pay');
  payButton.addEventListener('click', async (e) => {
      e.preventDefault();
      console.log('pay clicked');
      // Load the publishable key from the server. The publishable key
      // is set in your .env file.
      const {publishableKey} = await fetch('/gateway/config').then((r) => r.json());
      console.log('publishableKey', publishableKey);
      if (!publishableKey) {
        addMessage(
          'No publishable key returned from the server. Please check `.env` and try again'
        );
        alert('Please set your Stripe publishable API key in the .env file');
      }

      const stripe = Stripe(publishableKey, {
        apiVersion: '2020-08-27',
      });
      //const {
      //  error: backendError,
      //  clientSecret,
      //} = await fetch('/gateway/create-payment-intent').then(r => r.json());
      const {
        error: backendError,
        clientSecret,
      } = await fetch('/gateway/create-payment-intent', {
        method: 'POST', // Specify the HTTP method as POST
        headers: {
        'Content-Type': 'application/json' // Set the content type header
        },
        body: JSON.stringify({amount : '60'}) // Optional payload. Modify this if you need to send data in the request body
      }).then(r => r.json());

      console.log('clientSecret', clientSecret);
      if (backendError) {
        addMessage(backendError.message);
      }
      addMessage(`Client secret returned.`);
      addMessage(`${receipt}`);
      const elements = stripe.elements({ clientSecret });
      console.log('elements', elements);

      const paymentElement = elements.create('payment');
      paymentElement.mount('#payment-element');
      const linkAuthenticationElement = elements.create("linkAuthentication");
      linkAuthenticationElement.mount("#link-authentication-element");
      const form = document.getElementById('payment-form');
      let submitted = false;
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if(submitted) { return; }
        submitted = true;
        form.querySelector('button').disabled = true;
        const nameInput = document.querySelector('#name');
        const {error: stripeError} = await stripe.confirmPayment({
          elements,
          confirmParams: {
            return_url: `${window.location.origin}/gateway/client/return.html`,
          }
        });
        if (stripeError) {
          addMessage(stripeError.message);
          submitted = false;
          form.querySelector('button').disabled = false;
          return;
        }
      });
  });

  const tempButton = document.getElementById('temp');
  tempButton.addEventListener('click', async (e) => {
    e.preventDefault();
    console.log("minting Nzd to transient wallet");
          const transientWallet = await fetch('/gateway/wallet', {
            method: 'POST', // Specify the HTTP method as POST
            headers: {
            'Content-Type': 'application/json' // Set the content type header
            },
            body: JSON.stringify({paymentIntentId : ''}) // Optional payload. Modify this if you need to send data in the request body
            }).then((r) => r.json());
      console.log(`response from /wallet: ${JSON.stringify(transientWallet)}`);

      const a = transientWallet.Uint8;
      const b = Object.values(a);

      const newListItem = document.createElement("li");
      const textNode = document.createTextNode(`[${Object.values(a)}]`);
      newListItem.appendChild(textNode);
      const placeholderNode = document.getElementById("output");
      placeholderNode.appendChild(newListItem);


      console.log(b);
  });

});
