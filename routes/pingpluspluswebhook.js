var router = require('express').Router();
var classnameModule = require('/home/leanengine/app' + '/cloud/classname.js');
var messageModule = require('/home/leanengine/app' + '/cloud/message.js');
var pushModule = require('/home/leanengine/app' + '/cloud/pushmessage.js');

var AV = require('leanengine');
// Ping++ app info
var API_KEY = "sk_live_b5C0aTavTe9KjHyLuD9C4Ga9" //"sk_test_qb58aPjHiDKC1mr1OSSyfnbP" //ping++ Test/Live Key
var APP_ID = "app_mjj10KPGqXzPDiHe" //ping++ APP ID
var pingpp = require('pingpp')(API_KEY);

var crypto = require("crypto"),
    fs  = require("fs");

var pub_key_path = "/home/leanengine/app/pingpluspluskeys/rsa_public_key.pem";

router.post('/', function(request, response) {
  pingpp.parseHeaders(request.headers); // 把从客户端传上来的 Headers 传到这里
  //ping++ private key
  pingpp.setPrivateKeyPath("/home/leanengine/app/pingpluspluskeys/rsa_private_key.pem");
  request.setEncoding('utf8');
  
  var postData = JSON.stringify(request.body);
  var resp = function (ret, status_code) {
      response.writeHead(status_code, {
        "Content-Type": "text/plain; charset=utf-8"
      });
      response.end(ret);
    }
  var event = JSON.parse(postData);
  console.log("ping++ Webhook: event type: " + event.type + ", transactionId->" + event.data.object.id + ", order_no->" + event.data.object.order_no);
  
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


// verify webhooks
var verify_signature = function(raw_data, signature, pub_key_path) {
  try
  {
      //console.log('raw_data-> '+ raw_data + ',   signature-> '+ signature + ',   pub_key_path-> ' + pub_key_path);
	  var verifier = crypto.createVerify('RSA-SHA256').update(raw_data, "utf8");
	  var pub_key = fs.readFileSync(pub_key_path, "utf8");
	  return verifier.verify(pub_key, signature, 'base64');
  }
  catch (err) {
	  console.log(err);
      return false;
  }
}

var topup = function(payment,event){
	var data = event.data.object;
	payment.set("status",messageModule.PF_SHIPPING_PAYMENT_STATUS_SUCCESS());
	payment.set("transactionNumber",data.transaction_no);
	payment.save().then(function(result){
	    var user = payment.get("user");
	    var balance = user.get("totalMoney") + (data.amount/100);
		user.set("totalMoney",balance);
		user.save().then(function(result){
			console.log("ping++ Webhook: Payment - Topup success for user->" + user.id + " with transactionId-> " + data.id + " with amount->" + (data.amount/100));
			pushModule.PushPaymentTopupSucceedToUser(payment,(data.amount/100),user);
		},function (error) {
			console.log(error.message);
		});
	},function (error) {
		console.log(error.message);
	});
}

var transfer = function(payment,event){
	var data = event.data.object;
	payment.set("status",messageModule.PF_SHIPPING_PAYMENT_STATUS_SUCCESS());
	payment.set("transactionNumber",data.transaction_no);
	payment.save().then(function(result){
	    var user = payment.get("user");
		var balance = user.get("forzenMoney") + (data.amount/100);
		user.set("forzenMoney",balance);
		user.save().then(function(result){
			console.log("ping++ Webhook: Payment - Withdraw success for user->" + user.id + " with transactionId-> " + data.id + " with amount->" + (data.amount/100));
			pushModule.PushWithdrawSucceedToUser(payment,(data.amount/100),user);
		},function (error) {
			console.log(error.message);
		});
	},function (error) {
		console.log(error.message);
	});
}

var PaymentChargeShippingList = function(payment,event){
    var Shipping = AV.Object.extend(classnameModule.GetShippingClass());
    var shippingQuery = new AV.Query(Shipping);
			
	var data = event.data.object;
	payment.set("status",messageModule.PF_SHIPPING_PAYMENT_STATUS_SUCCESS());
	payment.set("transactionNumber",data.transaction_no);
	payment.save().then(function(result){
	    var user = payment.get("user");
		var balance = user.get("totalMoney") - ((data.amount+payment.get("usingBalance"))/100);
		user.set("totalMoney",balance);
		//user.set("scores",0);//todo
		user.save().then(function(result){
			console.log("ping++ Webhook: Payment - PaymentChargeShippingList success for user->" + user.id + " with transactionId-> " + data.id + " with amount->" + (data.amount/100));
			shippingQuery.equalTo("payment", payment);
			shippingQuery.include("cargo");
			shippingQuery.include("flight");
			shippingQuery.find({
					success: function (shippings) {
						// The object was retrieved successfully.
						for(var i=0; i<shippings.length; i++)
						{
							shippings[i].set("paymentStatus",messageModule.PF_SHIPPING_PAYMENT_STATUS_SUCCESS());
							shippings[i].save().then(function(sp){
								pushModule.PushChargeShippingListSucceedToCargoUser(payment,(data.amount/100),shippings[i],user);
								pushModule.PushChargeShippingListSucceedToFlightUser(payment,(data.amount/100),shippings[i],user);
							});
						}
					},
					error: function (error) {
						// The object was not retrieved successfully.
						console.log(error.message);
					}
				});
		},function (error) {
			console.log(error.message);
		});
	},function (error) {
		console.log(error.message);
	});
}

module.exports = router;