document.addEventListener('DOMContentLoaded', async () => {
    function getPurchaseValue() {
        let inputValue = document.getElementById("numericInput").value;
        return inputValue;
    }

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
        alert('Please set your Stripe publishable API key in the .env file');
      }

      const stripe = Stripe(publishableKey, {
        apiVersion: '2020-08-27',
      });
      //const {
      //  error: backendError,
      //  clientSecret,
      //} = await fetch('/gateway/create-payment-intent').then(r => r.json());
      const payment_amount = getPurchaseValue();
      const {
        error: backendError,
        clientSecret,
      } = await fetch('/gateway/create-payment-intent', {
        method: 'POST', // Specify the HTTP method as POST
        headers: {
        'Content-Type': 'application/json' // Set the content type header
        },
        body: JSON.stringify({amount : payment_amount}) // Optional payload. Modify this if you need to send data in the request body
      }).then(r => r.json());

      console.log('clientSecret', clientSecret);
      if (backendError) {
      }
      const elements = stripe.elements({ clientSecret });
      console.log('elements', elements);

      const paymentElement = elements.create('payment');
      paymentElement.mount('#payment-element');
      const linkAuthenticationElement = elements.create("linkAuthentication");
      linkAuthenticationElement.mount("#link-authentication-element");
      const form = document.getElementById('payment-form');
      form.classList.remove("hideMe");
      form.classList.add("showMe");

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
          submitted = false;
          form.querySelector('button').disabled = false;
          return;
        }
      });
  });

});
