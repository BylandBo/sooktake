//******Varibales Definition******//
var classnameModule = require('./classname');
var messageModule = require('./message');
var pushModule = require('./pushmessage');
var AV = require('leanengine');
var crypto = require('crypto');

/*Ping++ API*/
var API_KEY = "sk_live_b5C0aTavTe9KjHyLuD9C4Ga9" //"sk_test_qb58aPjHiDKC1mr1OSSyfnbP" //ping++ Test/Live Key
var APP_ID = "app_mjj10KPGqXzPDiHe" //ping++ APP ID
var pingpp = require('pingpp')(API_KEY);
var pub_key_path = __dirname + "/rsa_public_key.pem";
pingpp.setPrivateKeyPath(__dirname + "/rsa_private_key.pem");
//******Functions Definition******//


/*payment function*/

AV.Cloud.define("PaymentTopup", function (request, response) {
    var UserDetails = AV.Object.extend(classnameModule.GetUserDetailsClass());
    var userDetailsQuery = new AV.Query(UserDetails);
	
    var amount = request.params.amount;
	var channel = request.params.channel;
	var userId = request.params.userId;

	var order_no = crypto.createHash('md5')
        .update(new Date().getTime().toString())
        .digest('hex').substr(0, 16);
		
	var ip = request.meta.remoteAddress;
	
	console.log("Payment - Topup: charge creation: transactionId(order_no)->" + order_no + ", UserId->" + userId + ", ip->" + ip + ", channel->"+ channel + ", amount->" + (amount/100)); 
	pingpp.charges.create({
	  order_no:  order_no,
	  app:       { id: APP_ID },
	  channel:   channel,
	  amount:    amount,
	  client_ip: ip,
	  currency:  "cny",
	  subject:   "PaymentTopup",
	  body:      userId
	}, function(err, charge) {
	  if(err != null)
		console.log(err);
	  CreatePayment(charge,response);
	});
});

var CreatePayment = function (charge, response) {
	
	var Payment = AV.Object.extend(classnameModule.GetPaymentClass());
    var myPayment = new Payment();
	
	myPayment.set("paymentChannel", charge.channel);
	myPayment.set("total", (charge.amount/100));
	myPayment.set("status", messageModule.PF_SHIPPING_PAYMENT_STATUS_PENDING());
	myPayment.set("type", messageModule.PF_SHIPPING_PAYMENT_TOPUP());
	myPayment.set("user",charge.body);
	myPayment.set("transactionId",charge.order_no)
	myPayment.save(null, {
	  success: function(payment) {
	    console.log("Payment - Topup: payment creation succeed: transactionId(order_no)->" + charge.order_no + ", UserId->" + charge.body); 
		response.success(charge);
	  },
	  error: function(message, error) {
		console.log(error.message);
		response.error(messageModule.errorMsg());
	  }
	});
};