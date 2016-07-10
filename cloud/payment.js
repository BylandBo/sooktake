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
pingpp.setPrivateKeyPath("/home/leanengine/app/pingpluspluskeys/rsa_private_key.pem");
//******Functions Definition******//


/*payment function*/

AV.Cloud.define("PaymentTopup", function (request, response) {
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
	  subject:   "soontake充值",
	  body:      "Soontake 充值"
	}, function(err, charge) {
	  if(err != null)
		console.log(err);
	  CreatePayment(userId,charge,messageModule.PF_SHIPPING_PAYMENT_TOPUP(),response);
	});
});

AV.Cloud.define("PaymentWithdrawToWechat", function (request, response) {
    var amount = request.params.amount;
	var userId = request.params.userId;

	var order_no = crypto.createHash('md5')
        .update(new Date().getTime().toString())
        .digest('hex').substr(0, 16);
	
	
	console.log("Payment - WithdrawToWechat: transfer creation: transactionId(order_no)->" + order_no + ", UserId->" + userId + ", channel->"+ "wx" + ", amount->" + (amount/100)); 
	
	var userQuery = new AV.Query(AV.User);
	AV.Cloud.useMasterKey();
	userQuery.equalTo("objectId", userId);
	userQuery.include("wechatInfo");
	userQuery.find().then(function (user) {
		if(user.length <= 0)
		{
			console.log("Payment - WithdrawToWechat: cannot find user " + userId );
		}
		else
		{
			var user = user[0];
			if(user.get("isBindWechat") == "YES")
			{
			   var wechatInfo = user.get("wechatInfo");
			   if(wechatInfo != null)
			   {
				    var openId = wechatInfo.get("openId");
				  	pingpp.transfers.create({
					  order_no:  order_no,
					  app:       { id: APP_ID },
					  channel:   "wx",
					  amount:    amount,
					  currency:  "cny",
					  type:      "b2c",
					  recipient:   openId,
					  description: "soontake 取款"
					}, function(err, transfer) {
						  if(err != null)
							console.log(err);
					      CreatePayment(userId,transfer,messageModule.PF_SHIPPING_PAYMENT_WITHDRAW(),response);
					});
			   }
			   else
			    {
				  var errormsg = "Payment - WithdrawToWechat: cannot find wechat info for user: " + userId;
				  console.log(errormsg);
				  response.error(errormsg);
				}
			}
			else{
				var errormsg2 = "Payment - WithdrawToWechat: user: " + userId + " is not bind with wechat account";
				console.log(errormsg2);
				response.error(errormsg2);
			}
		}
	},function (error) {
			console.log(error.message);
	});
});

var CreatePayment = function (userId, transfer, type, response) {
	
	var Payment = AV.Object.extend(classnameModule.GetPaymentClass());
    var myPayment = new Payment();
	
	myPayment.set("paymentChannel", transfer.channel);
	myPayment.set("total", (transfer.amount/100));
	myPayment.set("status", messageModule.PF_SHIPPING_PAYMENT_STATUS_PENDING());
	myPayment.set("type", type);
	myPayment.set("user",userId);
	myPayment.set("transactionId",transfer.order_no)
	myPayment.save(null, {
	  success: function(payment) {
	    console.log("Payment - " + type + ": payment creation succeed: transactionId(order_no)->" + transfer.order_no + ", UserId->" + userId); 
		response.success(transfer);
	  },
	  error: function(message, error) {
		console.log(error.message);
		response.error(messageModule.errorMsg());
	  }
	});
};