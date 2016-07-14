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
			function puts(error, stdout, stderr) { console.log(stdout) }
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
		else if(users[0].get("totalMoney") < (amount/100))
		{
			 console.log("Payment - WithdrawToWechat: transfer creation error: user balance not enough, order_no->" + order_no );
			 response.error({code: 135, message: "user balance not enough"});//135: user balance not enough
		}
		else
		{
			var sys = require('sys')
			var exec = require('child_process').exec;
			function puts(error, stdout, stderr) { console.log(stdout) }
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
	
	console.log("Payment - PaymentChargeShippingList: charge creation: order_no->" + order_no + ", UserId->" + userId + ", ip->" + ip + ", channel->"+ channel + ", amount->" + (amount/100) + ", usingBalance->" + (usingBalance/100)); 
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
			function puts(error, stdout, stderr) { console.log(stdout) }
			exec("ping api.pingxx.com", puts);
			
			var cql = "select include payment,* from "+ classnameModule.GetShippingClass()+" where objectId in (";
			for(var i=0; i<shippingList.length;i++)
			{
			    if(i != shippingList.length -1)
					cql += "'" + shippingList[i] + "',";
				else
					cql += "'" + shippingList[i] + "')";
			}
			console.log("cql->" + cql);
			AV.Query.doCloudQuery(cql).then(function (result) {
			      var isDuplicatePayment = false;
				  var isFirstTimePayment = true;
				  
				  var shippings = result.results;
				  for (var j=0; j<shippings.length; j++) {
					  if(shippings[j].get("paymentStatus") == messageModule.PF_SHIPPING_PAYMENT_STATUS_PROCESSING())
					  {
					    isDuplicatePayment = true;
						console.log("Payment - PaymentChargeShippingList: ShippingId->" + shippings[j].id + " already be paid");
					  }
					  if(shippings[j].get("payment") != null && shippings[j].get("payment") != "")
					  {
						isFirstTimePayment = false;
					  }  
				  }
				  if(isDuplicatePayment)
				     response.error({code: 100, message: "duplicate payment"});
				  else
				  {
					var user = users[0];
					if(isFirstTimePayment)//if first time payment, froze the user balance amount
					{
					 console.log("Payment - PaymentChargeShippingList: first time payment, forzenAmount->" + (usingBalance/100) + ", new forzenMoney->"+ (user.get("forzenMoney") + usingBalance/100) +", old forzenMoney->" + user.get("forzenMoney") + ";  totalMoney->" + user.get("totalMoney"));
					  var newforzenMoney = user.get("forzenMoney") + (usingBalance/100);
					  user.set("forzenMoney",newforzenMoney);
					}
					else
					{
						console.log("Payment - PaymentChargeShippingList: not first time payment, forzenAmount->" + (usingBalance/100) + ", forzenMoney->"+ user.get("forzenMoney") + "; totalMoney->" + user.get("totalMoney"));
					}
					var finalAmount = amount - usingBalance;
					console.log("Payment - PaymentChargeShippingList: charge creation starting, order_no->" + order_no );
					pingpp.charges.create({
					  order_no:  order_no,
					  app:       { id: APP_ID },
					  channel:   channel,
					  amount:    finalAmount,
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
						var newPayment = {amount:amount,usingBalance:usingBalance,usingCredit:usingCredit,usingVoucher:usingVoucher,voucherCode:voucherCode,channel:channel,user:user,status:messageModule.PF_SHIPPING_PAYMENT_STATUS_PENDING(),type:messageModule.PF_SHIPPING_PAYMENT_CHARGE()};
						console.log("Payment - PaymentChargeShippingList: parameter info->" + JSON.stringify(newPayment));
						CreateShippingPayment(newPayment,charge,shippings,response);
					  }
					});
			     }
			 }, function (error) {
				console.log(error.message);
			});
		}
	});
});

AV.Cloud.define("PaymentChargeShippingListWithBalance", function (request, response) {
    var shippingList = request.params.shippingList;
	var amount = request.params.amount;
	var usingBalance = request.params.usingBalance;
	var usingCredit = request.params.usingCredit;
	var usingVoucher = request.params.usingVoucher;
	var voucherCode = request.params.voucherCode;
	var userId = request.params.userId;

	var order_no = crypto.createHash('md5')
        .update(new Date().getTime().toString())
        .digest('hex').substr(0, 16);

	var ip = request.meta.remoteAddress;
	
	console.log("Payment - PaymentChargeShippingListWithBalance: charge creation: order_no->" + order_no + ", UserId->" + userId + ", ip->" + ip + ", amount->" + (amount/100) + ", usingBalance->" + (usingBalance/100)); 
	var userQuery = new AV.Query(AV.User);
	AV.Cloud.useMasterKey();
	userQuery.equalTo("objectId", userId);
	userQuery.include("wechatInfo");
	userQuery.find().then(function (users) {
		if(users.length <= 0)
		{
			console.log("Payment - PaymentChargeShippingListWithBalance: cannot find user " + userId );
		}
		else
		{	
			var cql = "select include payment,include cargo,include flight,* from "+ classnameModule.GetShippingClass()+" where objectId in (";
			for(var i=0; i<shippingList.length;i++)
			{
			    if(i != shippingList.length -1)
					cql += "'" + shippingList[i] + "',";
				else
					cql += "'" + shippingList[i] + "')";
			}
			console.log("cql->" + cql);
			AV.Query.doCloudQuery(cql).then(function (result) {
			      var isDuplicatePayment = false;
				  var shippings = result.results;
				  for (var j=0; j<shippings.length; j++) {
					  if(shippings[j].get("paymentStatus") == messageModule.PF_SHIPPING_PAYMENT_STATUS_PROCESSING())
					  {
					    isDuplicatePayment = true;
						console.log("Payment - PaymentChargeShippingList: ShippingId->" + shippings[j].id + " already be paid");
					  }
				  }
				  if(isDuplicatePayment)
				   response.error({code: 100, message: "duplicate payment"});
				  else
				  {
					var user = users[0];
				    var newtotalMoney = user.get("totalMoney") - (amount/100);
				    user.set("totalMoney", newtotalMoney);
					
					console.log("Payment - PaymentChargeShippingListWithBalance: charge creation starting, order_no->" + order_no );
					var newPayment = {amount:amount,usingBalance:usingBalance,usingCredit:usingCredit,usingVoucher:usingVoucher,voucherCode:voucherCode,channel:"usingBalance",user:user,status:messageModule.PF_SHIPPING_PAYMENT_STATUS_PROCESSING(),type:messageModule.PF_SHIPPING_PAYMENT_CHARGE(),order_no:order_no};
					console.log("Payment - PaymentChargeShippingListWithBalance: parameter info->" + JSON.stringify(newPayment));
					CreateShippingPaymentWithBalance(newPayment,shippings,response);
				  }
			 }, function (error) {
				console.log(error.message);
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

var CreateShippingPayment = function (newpayment, pingObj, shippings, response) {
	
	var Payment = AV.Object.extend(classnameModule.GetPaymentClass());
    var myPayment = new Payment();
	var Shipping = AV.Object.extend(classnameModule.GetShippingClass());
	
	myPayment.set("paymentChannel", pingObj.channel);
	myPayment.set("total", (pingObj.amount/100));
	myPayment.set("status", newpayment.status);
	myPayment.set("type", newpayment.type);
	myPayment.set("user",newpayment.user);
	myPayment.set("usingBalance",newpayment.usingBalance/100);
	myPayment.set("usingCredit",newpayment.usingCredit);
	myPayment.set("usingVoucher",newpayment.usingVoucher);
	myPayment.set("voucherCode",newpayment.voucherCode);
	myPayment.set("transactionId",pingObj.id)
	myPayment.set("orderNo",pingObj.order_no);
	myPayment.save(null, {
	  success: function(payment) {
	    console.log("Payment - " + newpayment.type + ": payment creation succeed: transactionId->" + pingObj.id + ", UserId->" + newpayment.user.id + ", order_no->" + pingObj.order_no); 
		
		//add payment history to user
		var user = newpayment.user;
		var paymentRelation = user.relation('paymentHistory');
		paymentRelation.add(payment);
		user.save();
		
		//update shipping
		for(var i=0; i<shippings.length;i++)
		{
			shippings[i].set("paymentStatus",newpayment.status);
			shippings[i].set("transferPaymentStatus",newpayment.status);
			shippings[i].set("payment",payment);
			shippings[i].save();
		}
		response.success(pingObj);
	  },
	  error: function(message, error) {
		console.log(error.message);
		response.error(messageModule.errorMsg());
	  }
	});
};

var CreateShippingPaymentWithBalance = function (newpayment, shippings, response) {
	
	var Payment = AV.Object.extend(classnameModule.GetPaymentClass());
    var myPayment = new Payment();
	var Shipping = AV.Object.extend(classnameModule.GetShippingClass());
	
	myPayment.set("paymentChannel", newpayment.channel);
	myPayment.set("total", (newpayment.amount/100));
	myPayment.set("status", newpayment.status);
	myPayment.set("type", newpayment.type);
	myPayment.set("user",newpayment.user);
	myPayment.set("usingBalance",newpayment.usingBalance/100);
	myPayment.set("usingCredit",newpayment.usingCredit);
	myPayment.set("usingVoucher",newpayment.usingVoucher);
	myPayment.set("voucherCode",newpayment.voucherCode);
	//myPayment.set("transactionId",newpayment.id)
	myPayment.set("orderNo",newpayment.order_no);
	myPayment.save(null, {
	  success: function(payment) {
	    console.log("Payment - " + newpayment.type + ": payment creation succeed: UserId->" + newpayment.user.id + ", order_no->" + newpayment.order_no); 
		//add payment history to user
		var user = newpayment.user;
		var paymentRelation = user.relation('paymentHistory');
		paymentRelation.add(payment);
		user.save();
		
		//update shipping
		for(var i=0; i<shippings.length;i++)
		{
			shippings[i].set("paymentStatus",newpayment.status);
			shippings[i].set("transferPaymentStatus",newpayment.status);
			shippings[i].set("payment",payment);
			shippings[i].save().then(function(shipping){
			    var totalAmount = payment.get("total");
				pushModule.PushChargeShippingListSucceedToCargoUser(payment,totalAmount,shipping,user);
				pushModule.PushChargeShippingListSucceedToFlightUser(payment,totalAmount,shipping,user);
			});
		}
		response.success(payment);
	  },
	  error: function(message, error) {
		console.log(error.message);
		response.error(messageModule.errorMsg());
	  }
	});
};