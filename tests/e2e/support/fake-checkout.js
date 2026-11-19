// Served in place of https://checkout.razorpay.com/v1/checkout.js during browser tests.
// Same shape as Razorpay's: new Razorpay(options).on("payment.failed", fn).open().
// The window has "Pay now" and "Fail" buttons; payments are signed by fake-services.mjs.
(function () {
  function Razorpay(options) {
    this.options = options;
    this.handlers = {};
  }
  Razorpay.prototype.on = function (event, handler) {
    this.handlers[event] = handler;
  };
  Razorpay.prototype.open = function () {
    var o = this.options;
    var self = this;
    var d = document.createElement("div");
    d.id = "fake-razorpay";
    d.setAttribute("role", "dialog");
    d.setAttribute("aria-label", "Pretend Razorpay");
    d.style.cssText =
      "position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:99999;display:flex;gap:8px;align-items:center;justify-content:center";
    d.setAttribute("data-amount", String(o.amount));
    d.innerHTML = '<button id="rzp-ok">Pay now</button><button id="rzp-fail">Fail</button>';
    document.body.appendChild(d);
    d.querySelector("#rzp-ok").onclick = function () {
      var pid = "pay_" + Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
      fetch("http://127.0.0.1:54399/sign?order=" + o.order_id + "&payment=" + pid)
        .then(function (r) {
          return r.text();
        })
        .then(function (sig) {
          d.remove();
          o.handler({ razorpay_order_id: o.order_id, razorpay_payment_id: pid, razorpay_signature: sig });
        });
    };
    d.querySelector("#rzp-fail").onclick = function () {
      var h = self.handlers["payment.failed"];
      if (h) h({ error: { reason: "payment_failed", metadata: { payment_id: "pay_failed" + Date.now() } } });
    };
  };
  window.Razorpay = Razorpay;
})();
