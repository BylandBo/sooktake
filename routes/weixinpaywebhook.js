var router = require('express').Router();
var classnameModule = require('/home/leanengine/app' + '/cloud/classname.js');
var messageModule = require('/home/leanengine/app' + '/cloud/message.js');
var pushModule = require('/home/leanengine/app' + '/cloud/pushmessage.js');

var AV = require('leanengine');

var crypto = require("crypto"),
fs  = require("fs");

router.post('/', function(request, response) {
  request.setEncoding('utf8');
  
  var postData = JSON.stringify(request.body);
  var resp = function (ret, status_code) {
      response.writeHead(status_code, {
        "Content-Type": "text/plain; charset=utf-8"
      });
      response.end(ret);
    }
  var event = JSON.parse(postData);
  console.log("Weixinpay Webhook: data: " + postData);
  
  var signature = request.headers['x-pingplusplus-signature'];
  if (verify_signature(postData, signature, pub_key_path)) {
	try {
      if (event.type === undefined) {
        return resp('Event no type column', 400);
      }
	
	var Payment = AV.Object.extend(classnameModule.GetPaymentClass());
    var paymentQuery = new AV.Query(Payment);
	
	var data = event.data.object;
	paymentQuery.equalTo("transactionId", data.id);
	paymentQuery.include("user");
	paymentQuery.find({
        success: function (payments) {
		     if(payments.length <= 0)
			 {
				console.log("ping++ Webhook: Unknown payment with transactionId: " + data.id);
			 }
			 else
			 {
				 var payment = payments[0];
				 switch (event.type) {
					case "charge.succeeded":
					  // asyn handling to charge succeed
					  if(payment.get("type") == messageModule.PF_SHIPPING_PAYMENT_TOPUP()){
						topup(payment,event);
					  }
					  else if(payment.get("type") == messageModule.PF_SHIPPING_PAYMENT_CHARGE()){
					    PaymentChargeShippingList(payment,event);
					  }
					  return resp("OK", 200);
					  break;
				    case "transfer.succeeded":
					  // asyn handling to refund succeed
					  transfer(payment,event);
					  return resp("OK", 200);
					  break;
					case "refund.succeeded":
					  // asyn handling to refund succeed
					  return resp("OK", 200);
					  break;
					default:
					  return resp("Unknown Event type", 400);
					  break;
				  }
			 }
        },
        error: function (error) {
            // The object was not retrieved successfully.
            console.log(error.message);
        }
    });
    } catch (err) {
	  console.log(err);
      return resp('JSON serializ failed', 400);
    }
	console.log('ping++ Webhook: TransactionId->'+event.data.object.id+' signature verification succeeded');
	} else {
	  console.log('ping++ Webhook: TransactionId->'+event.data.object.id+' signature verification failed');
   }
});

module.exports = router;