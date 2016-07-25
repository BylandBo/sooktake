var router = require('express').Router();
var xml2js = require('xml2js');
var classnameModule = require('/home/leanengine/app' + '/cloud/classname.js');
var messageModule = require('/home/leanengine/app' + '/cloud/message.js');
var pushModule = require('/home/leanengine/app' + '/cloud/pushmessage.js');
var AV = require('leanengine');

var returnSUCCESSxml = function(msg){ return buildXML({return_code: 'SUCCESS',return_msg:msg})};
var returnFAILxml = function(msg){ buildXML({return_code: 'FAIL',return_msg:msg})};

router.post('/', function(request, response, body) {
  request.setEncoding('utf8');
  
  console.log("Weixinpay Webhook: hello");
  console.log("Weixinpay Webhook: data: " + body);
  console.log("Weixinpay Webhook: request: " + request);
  
  var postData = parseXML(request);
  console.log("Weixinpay Webhook jsondata: " + JSON.stringify(postData));
   
  var resp = function (ret, status_code) {
      response.writeHead(status_code, {
        "Content-Type": "text/xml; charset=utf-8"
      });
      response.end(ret);
    }
	
  var data = JSON.parse(postData);
  try {
    if (data.return_code != "SUCCESS") {
	  return resp(returnFAILxml(data.return_msg), 400);
    }
	var Payment = AV.Object.extend(classnameModule.GetPaymentClass());
    var paymentQuery = new AV.Query(Payment);
	
	paymentQuery.equalTo("orderNo", data.out_trade_no);
	paymentQuery.include("user");
	paymentQuery.find({
        success: function (payments) {
		     if(payments.length <= 0)
			 {
				console.log("ping++ Webhook: Unknown payment with transactionId: " + data.transaction_id);
			 }
			 else
			 {
				 var payment = payments[0];
				 switch (data.attach) {
					case messageModule.PF_SHIPPING_PAYMENT_TOPUP():
					  // asyn handling to charge succeed
						topup(payment,data);
					  return resp(returnSUCCESSxml('OK'), 200);
					  break;
					default:
					  return resp(returnFAILxml('Unknown Event type'), 400);
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
});

parseXML = function(xml, fn){
	var parser = new xml2js.Parser({ trim:true, explicitArray:false, explicitRoot:false });
	parser.parseString(xml, fn||function(err, result){
		return result;
	});
};

buildXML = function(json){
	var builder = new xml2js.Builder();
	return builder.buildObject(json);
};

var topup = function(payment,data){
	payment.set("status",messageModule.PF_SHIPPING_PAYMENT_STATUS_SUCCESS());
	payment.set("transactionId",data.transaction_id);
	payment.save().then(function(result){
	    var user = payment.get("user");
	    var balance = user.get("totalMoney") + data.total_fee;
		user.set("totalMoney",balance);
		user.save().then(function(result){
			console.log("wx Webhook: Payment - Topup success for user->" + user.id + " with transactionId-> " + data.transaction_id + " with amount->" + data.total_fee);
			pushModule.PushPaymentTopupSucceedToUser(payment,data.total_fee,user);
		},function (error) {
			console.log(error.message);
		});
	},function (error) {
		console.log(error.message);
	});
}

module.exports = router;