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
	
	console.log("Payment - Topup: charge creation: order_no->" + order_no + ", UserId->" + userId + ", ip->" + ip + ", channel->"+ channel + ", amount->" + (amount/100)); 
	var userQuery = new AV.Query(AV.User);
	AV.Cloud.useMasterKey();
	userQuery.equalTo("objectId", userId);
	userQuery.include("wechatInfo");
	userQuery.find().then(function (users) {
		if(users.length <= 0)
		{
			console.log("Payment - Topup: cannot find user " + userId );
		}
		else
		{
		    var sys = require('sys')
			var exec = require('child_process').exec;
			function puts(error, stdout, stderr) { sys.puts(stdout) }
			exec("ping api.pingxx.com", puts);
			
			var user = users[0];
			console.log("Payment - Topup: charge creation starting, order_no->" + order_no );
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
			  if(err != null){
			    console.log("Payment - Topup: charge creation error, order_no->" + order_no );
				console.log(err);
				response.error(err.message);
			  }
			  else
			    CreatePayment(user,charge,messageModule.PF_SHIPPING_PAYMENT_TOPUP(),response);
			});
		}
	});
});

AV.Cloud.define("PaymentWithdrawToWechat", function (request, response) {
    var amount = request.params.amount;
	var userId = request.params.userId;

	var order_no = crypto.createHash('md5')
        .update(new Date().getTime().toString())
        .digest('hex').substr(0, 16);
	
	
	console.log("Payment - WithdrawToWechat: transfer creation: order_no->" + order_no + ", UserId->" + userId + ", channel->"+ "wx" + ", amount->" + (amount/100)); 
	
	var userQuery = new AV.Query(AV.User);
	AV.Cloud.useMasterKey();
	userQuery.equalTo("objectId", userId);
	userQuery.include("wechatInfo");
	userQuery.find().then(function (users) {
		if(users.length <= 0)
		{
			console.log("Payment - WithdrawToWechat: cannot find user " + userId );
		}
		else
		{
			var sys = require('sys')
			var exec = require('child_process').exec;
			function puts(error, stdout, stderr) { sys.puts(stdout) }
			exec("ping api.pingxx.com", puts);
			
			var user = users[0];
			if(user.get("isBindWechat") == "YES")
			{
			   var wechatInfo = user.get("wechatInfo");
			   if(wechatInfo != null)
			   {
					console.log("Payment - WithdrawToWechat: transfer creation starting, order_no->" + order_no );
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
						  {
						    console.log("Payment - WithdrawToWechat: transfer creation error, order_no->" + order_no );
							console.log(err);
							response.error(err.message);
						  }
						  else if(transfer.status == messageModule.PF_SHIPPING_PAYMENT_STATUS_FAILED())
						  {
						    console.log("Payment - WithdrawToWechat: transfer creation error:"+ transfer.failure_msg +", order_no->" + order_no );
							response.error({code: 136, message: transfer.failure_msg});//135: user balance not enough
						  }
						  else
						  {
					        CreatePayment(user,transfer,messageModule.PF_SHIPPING_PAYMENT_WITHDRAW(),response);
						  }
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

AV.Cloud.define("PaymentChargeShippingList", function (request, response) {
    var shippingList = request.params.shippingList;
	var amount = request.params.amount;
	var usingBalance = request.params.usingBalance;
	var usingCredit = request.params.usingCredit;
	var usingVoucher = request.params.usingVoucher;
	var voucherCode = request.params.voucherCode;
	var channel = request.params.channel;
	var userId = request.params.userId;

	var order_no = crypto.createHash('md5')
        .update(new Date().getTime().toString())
        .digest('hex').substr(0, 16);

	var ip = request.meta.remoteAddress;
	
	console.log("Payment - PaymentChargeShippingList: charge creation: order_no->" + order_no + ", UserId->" + userId + ", ip->" + ip + ", channel->"+ channel + ", amount->" + (amount/100)); 
	var userQuery = new AV.Query(AV.User);
	AV.Cloud.useMasterKey();
	userQuery.equalTo("objectId", userId);
	userQuery.include("wechatInfo");
	userQuery.find().then(function (users) {
		if(users.length <= 0)
		{
			console.log("Payment - PaymentChargeShippingList: cannot find user " + userId );
		}
		else
		{
		    var sys = require('sys')
			var exec = require('child_process').exec;
			function puts(error, stdout, stderr) { sys.puts(stdout) }
			exec("ping api.pingxx.com", puts);
			
			var user = users[0];
			console.log("Payment - PaymentChargeShippingList: charge creation starting, order_no->" + order_no );
			pingpp.charges.create({
			  order_no:  order_no,
			  app:       { id: APP_ID },
			  channel:   channel,
			  amount:    amount,
			  client_ip: ip,
			  currency:  "cny",
			  subject:   "soontake寄货人付款",
			  body:      "Soontake 寄货人付款"
			}, function(err, charge) {
			  if(err != null){
			    console.log("Payment - PaymentChargeShippingList: charge creation error, order_no->" + order_no );
				console.log(err);
				response.error(err.message);
			  }
			  else
			  {
			    var newPayment = {amount:amount,usingBalance:usingBalance,usingCredit:usingCredit,usingVoucher:usingVoucher,voucherCode:voucherCode,channel:channel,user:user,status:messageModule.PF_SHIPPING_PAYMENT_CHARGE()};
				console.log("Payment - PaymentChargeShippingList: parameter info->" + JSON.stringify(newPayment));
				CreateShippingPayment(newPayment,charge,shippingList,response);
			  }
			});
		}
	});
});

var CreatePayment = function (user, pingObj, type, response) {
	
	var Payment = AV.Object.extend(classnameModule.GetPaymentClass());
    var myPayment = new Payment();
	
	myPayment.set("paymentChannel", pingObj.channel);
	myPayment.set("total", (pingObj.amount/100));
	myPayment.set("status", messageModule.PF_SHIPPING_PAYMENT_STATUS_PENDING());
	myPayment.set("type", type);
	myPayment.set("user",user);
	myPayment.set("transactionId",pingObj.id)
	myPayment.set("orderNo",pingObj.order_no);
	myPayment.save(null, {
	  success: function(payment) {
	    console.log("Payment - " + type + ": payment creation succeed: transactionId->" + pingObj.id + ", UserId->" + user.id + ", order_no->" + pingObj.order_no); 
		//add payment history to user
		var paymentRelation = user.relation('paymentHistory');
		paymentRelation.add(payment);
		user.save();
		
		response.success(pingObj);
	  },
	  error: function(message, error) {
		console.log(error.message);
		response.error(messageModule.errorMsg());
	  }
	});
};

var CreateShippingPayment = function (newpayment, pingObj, shippingList, response) {
	
	var Payment = AV.Object.extend(classnameModule.GetPaymentClass());
    var myPayment = new Payment();
	var Shipping = AV.Object.extend(classnameModule.GetShippingClass());
	
	myPayment.set("paymentChannel", pingObj.channel);
	myPayment.set("total", (pingObj.amount/100));
	myPayment.set("status", newpayment.status);
	myPayment.set("type", newpayment.type);
	myPayment.set("user",newpayment.user);
	myPayment.set("usingBalance",newpayment.usingBalance);
	myPayment.set("usingCredit",newpayment.usingCredit);
	myPayment.set("usingVoucher",newpayment.usingVoucher);
	myPayment.set("voucherCode",newpayment.voucherCode);
	myPayment.set("transactionId",pingObj.id)
	myPayment.set("orderNo",pingObj.order_no);
	myPayment.save(null, {
	  success: function(payment) {
	    console.log("Payment - " + newpayment.type + ": payment creation succeed: transactionId->" + pingObj.id + ", UserId->" + newpayment.user.id + ", order_no->" + pingObj.order_no); 
		//add payment history to user
		var paymentRelation = user.relation('paymentHistory');
		paymentRelation.add(payment);
		user.save();
		for(var i=0; i<shippingList.length;i++)
		{
			var shippingQuery = new AV.Query(Shipping);
			shippingQuery.get(shippingList[i], {
					success: function (shipping) {
						// The object was retrieved successfully.
						shipping.set("paymentStatus",newpayment.status);
						shipping.set("transferPaymentStatus",newpayment.status);
						shipping.set("payment",payment);
						shipping.save();
					},
					error: function (error) {
						// The object was not retrieved successfully.
						console.log(error.message);
					}
				});
		}
		response.success(pingObj);
	  },
	  error: function(message, error) {
		console.log(error.message);
		response.error(messageModule.errorMsg());
	  }
	});
};