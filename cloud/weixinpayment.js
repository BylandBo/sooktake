//******Varibales Definition******//
var classnameModule = require('./classname');
var messageModule = require('./message');
var pushModule = require('./pushmessage');
var AV = require('leanengine');
var crypto = require('crypto');
//var WXPay = require('weixin-pay');
var WXPay = require('./wxpay');
var fs  = require('fs');
var async = require("async");

/*Weixinpay API*/
var MERCHANT_ID = "1355707002" //微信商户号
var APP_ID = "wx2897d2d3645a2cc1" //weixin pay APP ID
var API_KEY = "5dacd15d3208ef852ec6a763e6f656f1" //微信商户平台API密钥

var WebHookUrl = "https://soontake.avosapps.us/weixinpaywebhook";

var wxpay = WXPay({
    appid: APP_ID,
    mch_id: MERCHANT_ID,
    partner_key: API_KEY, //微信商户平台API密钥 
    pfx: fs.readFileSync('/home/leanengine/app/weixinpaykeys/apiclient_cert.p12'), //微信商户平台证书
});

//******Functions Definition******//
AV.Cloud.define("PaymentTopup", function (request, response) {
    var amount = request.params.amount;
	var channel = request.params.channel;
	var userId = request.params.userId;

	var order_no = crypto.createHash('md5')
        .update(new Date().getTime().toString())
        .digest('hex').substr(0, 16);
		
	var ip = request.meta.remoteAddress;
	
	var params = {amount:amount,channel:channel,userId:userId,order_no:order_no};
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
			var user = users[0];
			console.log("Payment - Topup: charge creation starting, order_no->" + order_no );
			
			wxpay.createUnifiedOrder({
				body: 'Soontake 充值',
				out_trade_no: order_no,
				total_fee: amount,
				spbill_create_ip: ip,
				notify_url: WebHookUrl,
				trade_type: 'APP',
				attach: messageModule.PF_SHIPPING_PAYMENT_TOPUP()
			}, function(err, charge){
				console.log(charge);
				if(err != null || charge.return_code != 'SUCCESS' || (charge.err_code != null&&charge.err_code != '')){
			     console.log("Payment - Topup: charge creation error, order_no->" + order_no + ", err_code->" + charge.err_code + ", err_desc->" + charge.err_code_des );
				 console.log(err);
				 if(err != null)
					response.error(err.message);
				 else
					response.error({code: charge.err_code, message: charge.err_code_des});
				}
				else
				{
				  CreateTopupPayment(user,charge,params,messageModule.PF_SHIPPING_PAYMENT_TOPUP(),response);
				}
			});
		}
	});
});

AV.Cloud.define("PaymentTopupCancel", function (request, response) {
    var prepayId = request.params.prepayId;
	
	var Payment = AV.Object.extend(classnameModule.GetPaymentClass());
	var paymentQuery = new AV.Query(Payment);
	
	console.log("Payment - PaymentTopupCancel: prepayId->" + prepayId); 
	
	paymentQuery.include("user");
	paymentQuery.equalTo("transactionNumber",prepayId);
	paymentQuery.find().then(function(payments){
			if(payments.length <= 0)
			{
				console.log("Payment - PaymentTopupCancel: cannot find payment: prepayId->" + prepayId );
			}
			else
			{
	        var payment = payments[0];			
			payment.set("status",messageModule.PF_SHIPPING_PAYMENT_STATUS_CANCEL());
			payment.save().then(function (py){
			     var cargoUser = payment.get("user");
				 //var newForzenMoney = cargoUser.get("forzenMoney") - payment.get("total");
				 //cargoUser.set("forzenMoney",newForzenMoney);
				 cargoUser.save().then(function(user){
					var totalAmount = payment.get("total");
					//pushModule.PushPaymentTopupCancelToCargoUser(payment,totalAmount,cargoUser);
				 });
				response.success(payment);
			});
		   }
		}, function (error) {
			console.log(error.message);
			response.error(messageModule.errorMsg());
	});
});

AV.Cloud.define("PaymentWithdrawToWechat", function (request, response) {
    var amount = request.params.amount;
	var userId = request.params.userId;

	var order_no = crypto.createHash('md5')
        .update(new Date().getTime().toString())
        .digest('hex').substr(0, 16);
	
	var ip = request.meta.remoteAddress;
	
	var params = {amount:amount,channel:"wx",userId:userId,order_no:order_no};
	console.log("Payment - WithdrawToWechat: transfer creation: order_no->" + order_no + ", UserId->" + userId + ", channel->"+ "wx" + ", amount->" + (amount/100)); 
	
	var userQuery = new AV.Query(AV.User);
	AV.Cloud.useMasterKey();
	userQuery.equalTo("objectId", userId);
	userQuery.include("wechatInfo");
	userQuery.include("details");
	userQuery.find().then(function (users) {
		if(users.length <= 0)
		{
			console.log("Payment - WithdrawToWechat: cannot find user " + userId );
		}
		else if((users[0].get("totalMoney") - users[0].get("forzenMoney")) < (amount/100))
		{
			 console.log("Payment - WithdrawToWechat: transfer creation error: user balance not enough, order_no->" + order_no );
			 response.error({code: 135, message: "user balance not enough"});//135: user balance not enough
		}
		else
		{
			var user = users[0];
			if(user.get("isBindWechat") == "YES")
			{
			   var wechatInfo = user.get("wechatInfo");
			   if(wechatInfo != null)
			   {
					console.log("Payment - WithdrawToWechat: transfer creation starting, order_no->" + order_no );
					var FrozenMoney = user.get("forzenMoney") + (amount/100);
					console.log("Payment - WithdrawToWechat: User Id->"+ user.id +" frozenMoney: before->" + user.get("forzenMoney") + ", after->" + FrozenMoney + ", withdrawAmount->" + (amount/100)); 
					user.set("forzenMoney",FrozenMoney);				
					user.save();
				    var openId = wechatInfo.get("openId");
					wxpay.createBusinessPayToWeixin({
						desc: 'Soontake 取款',
						partner_trade_no: order_no,
						openid: openId,
						check_name: 'NO_CHECK',
						//re_user_name: user.get("fullname"),
						amount: amount,
						spbill_create_ip: ip
					}, function(err, charge){
						console.log(charge);
						if(err != null || charge.return_code != 'SUCCESS' || (charge.err_code != null&&charge.err_code != '')){
						 console.log("Payment - WithdrawToWechat: charge creation error, order_no->" + order_no );
						//release user frozen money
						var FrozenMoney2 = user.get("forzenMoney") - (amount/100);
						user.set("forzenMoney",FrozenMoney2);
						user.save();
						
						if(charge.err_code == messageModule.PF_SHIPPING_PAYMENT_ERROR_SENDNUM_LIMIT())
						    response.error({code: 137, message: charge.err_code_des});
						else if (charge.err_code == messageModule.PF_SHIPPING_PAYMENT_ERROR_FREQ_LIMIT())
						    response.error({code: 138, message: charge.err_code_des});
						else if (charge.err_code == messageModule.PF_SHIPPING_PAYMENT_ERROR_NOTENOUGH())
						    response.error({code: 136, message: charge.err_code_des});
						else if(err != null)
							response.error(err.message);
						else
							response.error({code: charge.err_code, message: charge.err_code_des});
						}
						else
						{
						  CreateWithDrawPayment(user,charge,params,messageModule.PF_SHIPPING_PAYMENT_WITHDRAW(),response);
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
			response.error(error.message);
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
	userQuery.include("details");
	userQuery.find().then(function (users) {
		if(users.length <= 0)
		{
			console.log("Payment - PaymentChargeShippingList: cannot find user " + userId );
		}
		else
		{	
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
					  var newforzenMoney = user.get("forzenMoney") + (amount/100);
					  console.log("Payment - PaymentChargeShippingList: User Id->"+ user.id +" frozenMoney: before->" + user.get("forzenMoney") + ", after->" + newforzenMoney + ", Amount->" + (amount/100)); 
					  user.set("forzenMoney",newforzenMoney);
					}
					else
					{
						console.log("Payment - PaymentChargeShippingList: not first time payment" + ", forzenMoney->"+ user.get("forzenMoney") + "; totalMoney->" + user.get("totalMoney"));
					}
					
					if(channel == messageModule.PF_SHIPPING_PAYMENT_CHANNEL_WEIXIN())
					{
					var finalAmount = amount - usingBalance;
					console.log("Payment - PaymentChargeShippingList: charge creation starting, order_no->" + order_no );
					wxpay.createUnifiedOrder({
						body: 'Soontake 寄货人付款',
						out_trade_no: order_no,
						total_fee: finalAmount,
						spbill_create_ip: ip,
						notify_url: WebHookUrl,
						trade_type: 'APP',
						attach: messageModule.PF_SHIPPING_PAYMENT_CHARGE()
					}, function(err, charge){
						console.log(charge);
						if(err != null || charge.return_code != 'SUCCESS' || (charge.err_code != null&&charge.err_code != '')){
						 console.log("Payment - PaymentChargeShippingList: charge creation error, order_no->" + order_no );
						 if(err != null)
							response.error(err.message);
						 else
							response.error({code: charge.err_code, message: charge.err_code_des});
						}
						else
						{
						  var newPayment = {amount:amount,usingBalance:usingBalance,usingCredit:usingCredit,usingVoucher:usingVoucher,voucherCode:voucherCode,channel:channel,user:user,status:messageModule.PF_SHIPPING_PAYMENT_STATUS_PENDING(),type:messageModule.PF_SHIPPING_PAYMENT_CHARGE(),order_no:order_no};
						  //console.log("Payment - PaymentChargeShippingList: parameter info->" + JSON.stringify(newPayment));
						  CreateShippingPayment(newPayment,charge,shippings,response);
						}
					});
				   }
				   else if(channel == messageModule.PF_SHIPPING_PAYMENT_CHANNEL_ALIPAY())
				   {
				    //todo
				   }
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
						console.log("Payment - PaymentChargeShippingListWithBalance: ShippingId->" + shippings[j].id + " already be paid");
					  }
				  }
				  if(isDuplicatePayment)
				   response.error({code: 100, message: "duplicate payment"});
				  else
				  {
					var user = users[0];
				    //var newtotalMoney = user.get("totalMoney") - (amount/100);
					var newFrozenMoney = user.get("forzenMoney") + (amount/100);
					console.log("Payment - PaymentChargeShippingListWithBalance: User Id->"+ user.id +" frozenMoney: before->" + user.get("forzenMoney") + ", after->" + newFrozenMoney + ", Amount->" + (amount/100)); 
				    user.set("forzenMoney", newFrozenMoney);
					
					console.log("Payment - PaymentChargeShippingListWithBalance: charge creation starting, order_no->" + order_no );
					var newPayment = {amount:amount,usingBalance:usingBalance,usingCredit:usingCredit,usingVoucher:usingVoucher,voucherCode:voucherCode,channel:"usingBalance",user:user,status:messageModule.PF_SHIPPING_PAYMENT_STATUS_PROCESSING(),type:messageModule.PF_SHIPPING_PAYMENT_CHARGE(),order_no:order_no};
					//console.log("Payment - PaymentChargeShippingListWithBalance: parameter info->" + JSON.stringify(newPayment));
					CreateShippingPaymentWithBalance(newPayment,shippings,response);
				  }
			 }, function (error) {
				console.log(error.message);
			});
		}
	});
});

AV.Cloud.define("PaymentTransferToSender", function (request, response) {
    var shippingId = request.params.shippingId;
	
	var Payment = AV.Object.extend(classnameModule.GetPaymentClass());
	var paymentQuery = new AV.Query(Payment);
	
	var Shipping = AV.Object.extend(classnameModule.GetShippingClass());
    var shippingQuery = new AV.Query(Shipping);
	
	var order_no = crypto.createHash('md5')
        .update(new Date().getTime().toString())
        .digest('hex').substr(0, 16);
		
	console.log("Payment - PaymentTransferToSender: transfer creation: order_no->" + order_no + ", shippingId->" + shippingId); 
	
	shippingQuery.include("payment");
	shippingQuery.include("cargo");
	shippingQuery.include("flight");
	shippingQuery.get(shippingId).then(function(shipping){
	        var payment = shipping.get("payment");
			var cargo = shipping.get("cargo");
			var flight = shipping.get("flight");
			
			shipping.set("transferPaymentStatus",messageModule.PF_SHIPPING_PAYMENT_STATUS_SUCCESS());
			shipping.save();
		
			payment.set("status",messageModule.PF_SHIPPING_PAYMENT_STATUS_SUCCESS());
			payment.save().then(function (py){
				var myPayment = new Payment();
				myPayment.set("paymentChannel", "soontake");
				myPayment.set("total", py.get("total"));
				myPayment.set("status", messageModule.PF_SHIPPING_PAYMENT_STATUS_SUCCESS());
				myPayment.set("type", "transfer");
				myPayment.set("user",cargo.get("owner"));//cargo user
				myPayment.set("orderNo",order_no);
				myPayment.save().then(function (tp){
					flight.fetch({include: "owner"},
						   {
							   success: function(flightObj) {
							     var flightUser = flightObj.get("owner");
								 var paymentRelation = flightUser.relation('paymentHistory');
								 paymentRelation.add(tp);
								 var newTotalMoney = flightUser.get("totalMoney") + payment.get("total");
								 console.log("Payment - PaymentTransferToSender: flightUser totalMoney: before->" + flightUser.get("totalMoney") + ", after->" + newTotalMoney); 
								 flightUser.set("totalMoney",newTotalMoney);
								 flightUser.save().then(function(user){
								    var totalAmount = payment.get("total");
								    pushModule.PushPaymentTransferToSenderSucceedToFlightUser(payment,totalAmount,shipping,flightUser);
								 });
								},
							   error: function(message, error) {
								 console.log(error.message);
								 response.error(messageModule.errorMsg());
							    }
						   });
					cargo.fetch({include: "owner"},
						   {
							   success: function(cargoObj) {
							     var cargoUser = cargoObj.get("owner");
								 var newTotalMoney = cargoUser.get("totalMoney") - payment.get("total");
								 var newForzenMoney = cargoUser.get("forzenMoney") - payment.get("total");
								 console.log("Payment - PaymentTransferToSender: cargoUser->"+cargoUser.id+" totalMoney: before->" + cargoUser.get("totalMoney") + ", after->" + newTotalMoney);
								 cargoUser.set("totalMoney",newTotalMoney);
								 cargoUser.set("forzenMoney",newForzenMoney);
								 cargoUser.save().then(function(user){
									var totalAmount = payment.get("total");
									pushModule.PushPaymentTransferToSenderSucceedToCargoUser(payment,totalAmount,shipping,cargoUser);
								 });
								},
							   error: function(message, error) {
								 console.log(error.message);
								 response.error(messageModule.errorMsg());
							    }
						   });
				    response.success(myPayment);
				});
			});
		}, function (error) {
			console.log(error.message);
			response.error(messageModule.errorMsg());
	});
});

AV.Cloud.define("PaymentSendRefundRequest", function (request, response) {
    var shippingId = request.params.shippingId;
	var reasonCode = request.params.reasonCode;
	var reason = request.params.reason;
	
	var Payment = AV.Object.extend(classnameModule.GetPaymentClass());
    var myPayment = new Payment();
	
	var Shipping = AV.Object.extend(classnameModule.GetShippingClass());
    var shippingQuery = new AV.Query(Shipping);
	
	var order_no = crypto.createHash('md5')
        .update(new Date().getTime().toString())
        .digest('hex').substr(0, 16);
		
	console.log("Payment - PaymentSendRefundRequest: refund creation: order_no->" + order_no + ", shippingId->" + shippingId); 
	
	shippingQuery.include("payment");
	shippingQuery.include("cargo");
	shippingQuery.include("flight");
	shippingQuery.get(shippingId).then(function(shipping){
	        var payment = shipping.get("payment");
			var cargo = shipping.get("cargo");
			var flight = shipping.get("flight");
			
			if( shipping.get("transferPaymentStatus") == messageModule.PF_SHIPPING_PAYMENT_STATUS_APPROVEREFUND())
			{
			    console.log("Payment - PaymentSendRefundRequest: refund error: shippingId->" + shippingId +" already refunded"); 
				response.error({code: 101, message: "退款申请已经批准"});
			}
			else if( shipping.get("transferPaymentStatus") == messageModule.PF_SHIPPING_PAYMENT_STATUS_REQUESTREFUND())
			{
			    console.log("Payment - PaymentSendRefundRequest: refund error: shippingId->" + shippingId +" already requested"); 
				response.error({code: 102, message: "退款申请已经发出，请等待"});
			}
			else
			{
			myPayment.set("paymentChannel", "soontake");
			myPayment.set("total", payment.get("total"));
			myPayment.set("status", messageModule.PF_SHIPPING_PAYMENT_STATUS_PENDING());
			myPayment.set("type", messageModule.PF_SHIPPING_PAYMENT_REFUND());
			myPayment.set("user",cargo.get("owner"));//cargo user
			myPayment.set("orderNo",order_no);
			myPayment.set("reasonCode",reasonCode.toString());
			myPayment.set("reason",reason);
			myPayment.save(null, {
					  success: function(rp) {
						shipping.set("transferPaymentStatus",messageModule.PF_SHIPPING_PAYMENT_STATUS_REQUESTREFUND());
						shipping.set("refundPayment",myPayment);
						shipping.save();
						
						flight.fetch({include: "owner"},
							   {
								   success: function(flightObj) {
									 var flightUser = flightObj.get("owner");
									 var paymentRelation = flightUser.relation('paymentHistory');
									 paymentRelation.add(rp);
									 flightUser.save().then(function(user){
										var totalAmount = payment.get("total");
										pushModule.PushPaymentRefundToFlightUser(payment,totalAmount,shipping,flightUser);
									 });
									},
								   error: function(message, error) {
									 console.log(error.message);
									 response.error(messageModule.errorMsg());
									}
							   });
						cargo.fetch({include: "owner"},
							   {
								   success: function(cargoObj) {
									 var cargoUser = cargoObj.get("owner");
									 var paymentRelation = cargoUser.relation('paymentHistory');
									 paymentRelation.add(rp);
									 cargoUser.save().then(function(user){
										var totalAmount = payment.get("total");
										pushModule.PushPaymentRefundToCargotUser(payment,totalAmount,shipping,cargoUser);
									 });
									},
								   error: function(message, error) {
									 console.log(error.message);
									 response.error(messageModule.errorMsg());
									}
							   });
						response.success(rp);
					  },
					  error: function(message, error) {
						console.log(error.message);
						response.error(messageModule.errorMsg());
					  }
			});
		  }
		}, function (error) {
			console.log(error.message);
			response.error(messageModule.errorMsg());
	});
});

AV.Cloud.define("PaymentRejectRefundRequest", function (request, response) {
    var shippingId = request.params.shippingId;
	var reasonCode = request.params.reasonCode;
	var reason = request.params.reason;
	
	var Payment = AV.Object.extend(classnameModule.GetPaymentClass());
	var paymentQuery = new AV.Query(Payment);
	
	var Shipping = AV.Object.extend(classnameModule.GetShippingClass());
    var shippingQuery = new AV.Query(Shipping);

		
	console.log("Payment - PaymentRejectRefundRequest: refund reject by shipper: shippingId->" + shippingId); 
	
	shippingQuery.include("payment");
	shippingQuery.include("refundPayment");
	shippingQuery.include("cargo");
	shippingQuery.include("flight");
	shippingQuery.get(shippingId).then(function(shipping){
	        var payment = shipping.get("payment");
			var cargo = shipping.get("cargo");
			var flight = shipping.get("flight");
			var refundPayment = shipping.get("refundPayment");

			if(refundPayment.get("status") == messageModule.PF_SHIPPING_PAYMENT_STATUS_CANCELREFUND())
			{
			    response.error({code: 111, message: "货主已经取消退款请求"});
			}
			else
			{
				shipping.set("transferPaymentStatus",messageModule.PF_SHIPPING_PAYMENT_STATUS_REJECTREFUND());
				shipping.save().then(function (sp){
						refundPayment.set("status",messageModule.PF_SHIPPING_PAYMENT_STATUS_FAILED());
						refundPayment.set("reasonCode",reasonCode.toString());
						refundPayment.set("reason",reason);
						refundPayment.save();
						
						flight.fetch({include: "owner"},
							   {
								   success: function(flightObj) {
									 var flightUser = flightObj.get("owner");
									 var totalAmount = payment.get("total");
									 pushModule.PushPaymentRefundRejectToFlightUser(payment,totalAmount,shipping,flightUser);
									},
								   error: function(message, error) {
									 console.log(error.message);
									 response.error(messageModule.errorMsg());
									}
							   });
						cargo.fetch({include: "owner"},
							   {
								   success: function(cargoObj) {
									 var cargoUser = cargoObj.get("owner");
									 var totalAmount = payment.get("total");
									 pushModule.PushPaymentRefundRejectToCargotUser(payment,totalAmount,shipping,cargoUser);
									},
								   error: function(message, error) {
									 console.log(error.message);
									 response.error(messageModule.errorMsg());
									}
							   });
						console.log("Payment - PaymentRejectRefundRequest: refund reject by shipper: shippingId->" + shippingId + ", refundPaymentId->"+ refundPayment.id +" succeed"); 
						response.success(refundPayment);
				});
			}
	
		}, function (error) {
			console.log(error.message);
			response.error(messageModule.errorMsg());
	});
});

AV.Cloud.define("PaymentApproveRefundRequest", function (request, response) {
    var shippingId = request.params.shippingId;
	var reasonCode = request.params.reasonCode;
	var reason = request.params.reason;
	
	var Payment = AV.Object.extend(classnameModule.GetPaymentClass());
	var paymentQuery = new AV.Query(Payment);
	
	var Shipping = AV.Object.extend(classnameModule.GetShippingClass());
    var shippingQuery = new AV.Query(Shipping);

		
	console.log("Payment - PaymentApproveRefundRequest: refund approve by shipper: shippingId->" + shippingId); 
	
	shippingQuery.include("payment");
	shippingQuery.include("refundPayment");
	shippingQuery.include("cargo");
	shippingQuery.include("flight");
	shippingQuery.get(shippingId).then(function(shipping){
	        var payment = shipping.get("payment");
			var cargo = shipping.get("cargo");
			var flight = shipping.get("flight");
			var refundPayment = shipping.get("refundPayment");
			if( shipping.get("transferPaymentStatus") == messageModule.PF_SHIPPING_PAYMENT_STATUS_APPROVEREFUND())
			{
				response.error({code: 101, message: "退款申请已经批准"});
			}
			else if(shipping.get("transferPaymentStatus") == messageModule.PF_SHIPPING_PAYMENT_STATUS_REJECTREFUND())
			{
				response.error({code: 109, message: "退款申请已经拒绝"});
			}
			else if(refundPayment.get("status") == messageModule.PF_SHIPPING_PAYMENT_STATUS_CANCELREFUND())
			{
			    response.error({code: 111, message: "货主已经取消退款请求"});
			}
			else
			{
			shipping.set("transferPaymentStatus",messageModule.PF_SHIPPING_PAYMENT_STATUS_APPROVEREFUND());
			shipping.save().then(function (sp){
			        payment.set("status",messageModule.PF_SHIPPING_PAYMENT_STATUS_SUCCESS());
					payment.save();
					
					refundPayment.set("status",messageModule.PF_SHIPPING_PAYMENT_STATUS_SUCCESS());
					//refundPayment.set("reasonCode",reasonCode.toString());
					//refundPayment.set("reason",reason);
					refundPayment.save();
					
				    flight.fetch({include: "owner"},
						   {
							   success: function(flightObj) {
							     var flightUser = flightObj.get("owner");
								 var totalAmount = payment.get("total");
								 pushModule.PushPaymentRefundApproveToFlightUser(payment,totalAmount,shipping,flightUser);
								},
							   error: function(message, error) {
								 console.log(error.message);
								 response.error(messageModule.errorMsg());
							    }
						   });
					cargo.fetch({include: "owner"},
						   {
							   success: function(cargoObj) {
								 var cargoUser = cargoObj.get("owner");
								 var newForzenMoney = cargoUser.get("forzenMoney") - payment.get("total");
								 console.log("Payment - PaymentApproveRefundRequest: cargoUser->"+cargoUser.id+" frozenMoney: before->" + cargoUser.get("forzenMoney") + ", after->" + newForzenMoney); 
								 cargoUser.set("forzenMoney",newForzenMoney);
								 cargoUser.save().then(function(user){
									var totalAmount = payment.get("total");
									pushModule.PushPaymentRefundApproveToCargotUser(payment,totalAmount,shipping,cargoUser);
								 });
								},
							   error: function(message, error) {
								 console.log(error.message);
								 response.error(messageModule.errorMsg());
							    }
						   });
				    console.log("Payment - PaymentApproveRefundRequest: refund approve by shipper: shippingId->" + shippingId + ", refundPaymentId->"+ refundPayment.id +" succeed"); 
				    response.success(refundPayment);
			});
		   }
	
		}, function (error) {
			console.log(error.message);
			response.error(messageModule.errorMsg());
	});
});

AV.Cloud.define("PaymentCancelRefundRequest", function (request, response) {
    var shippingId = request.params.shippingId;
	var reasonCode = request.params.reasonCode;
	var reason = request.params.reason;
	
	var Payment = AV.Object.extend(classnameModule.GetPaymentClass());
	var paymentQuery = new AV.Query(Payment);
	
	var Shipping = AV.Object.extend(classnameModule.GetShippingClass());
    var shippingQuery = new AV.Query(Shipping);

		
	console.log("Payment - PaymentCancelRefundRequest: refund cancel by cargoer: shippingId->" + shippingId); 
	
	if(shippingId == null || shippingId == '')
	{
		response.error({code: 103, message: "没有退款申请"});
	}
			
	shippingQuery.include("payment");
	shippingQuery.include("refundPayment");
	shippingQuery.include("cargo");
	shippingQuery.include("flight");
	shippingQuery.get(shippingId).then(function(shipping){
	        var payment = shipping.get("payment");
			var cargo = shipping.get("cargo");
			var flight = shipping.get("flight");
			var refundPayment = shipping.get("refundPayment");
			if( shipping.get("transferPaymentStatus") == messageModule.PF_SHIPPING_PAYMENT_STATUS_APPROVEREFUND())
			{
				response.error({code: 101, message: "退款申请已经批准"});
			}
			else if(shipping.get("transferPaymentStatus") == messageModule.PF_SHIPPING_PAYMENT_STATUS_REJECTREFUND())
			{
				response.error({code: 109, message: "退款申请已经拒绝"});
			}
			else
			{
			    shipping.set("transferPaymentStatus",messageModule.PF_SHIPPING_PAYMENT_STATUS_PENDING());
			    shipping.save().then(function (sp){
			        payment.set("status",messageModule.PF_SHIPPING_PAYMENT_STATUS_SUCCESS());
					payment.save();
					
					refundPayment.set("status",messageModule.PF_SHIPPING_PAYMENT_STATUS_CANCELREFUND());
					refundPayment.save();
					
				    flight.fetch({include: "owner"},
						   {
							   success: function(flightObj) {
							     var flightUser = flightObj.get("owner");
								 var totalAmount = payment.get("total");
								 pushModule.PushPaymentRefundCancelToFlightUser(payment,totalAmount,shipping,flightUser);
								},
							   error: function(message, error) {
								 console.log(error.message);
								 response.error(messageModule.errorMsg());
							    }
						   });
					cargo.fetch({include: "owner"},
						   {
							   success: function(cargoObj) {
								 var cargoUser = cargoObj.get("owner");
								 var totalAmount = payment.get("total");
								 pushModule.PushPaymentRefundCancelToCargoUser(payment,totalAmount,shipping,cargoUser);
								},
							   error: function(message, error) {
								 console.log(error.message);
								 response.error(messageModule.errorMsg());
							    }
						   });
				    console.log("Payment - PaymentCancelRefundRequest: refund cancel by cargoer: shippingId->" + shippingId + ", refundPaymentId->"+ refundPayment.id +" succeed"); 
				    response.success(refundPayment);
			});
		   }
	
		}, function (error) {
			console.log(error.message);
			response.error(messageModule.errorMsg());
	});
});

AV.Cloud.define("PaymentChargeShippingListCancel", function (request, response) {
    var shippingList = request.params.shippingList;
	
	var Payment = AV.Object.extend(classnameModule.GetPaymentClass());
	var paymentQuery = new AV.Query(Payment);
	
	var Shipping = AV.Object.extend(classnameModule.GetShippingClass());
    var shippingQuery = new AV.Query(Shipping);
	
    for(var s=0; s <shippingList.length; s++)
    {	
	var shippingId = shippingList[s];
	console.log("Payment - PaymentChargeShippingListCancel: shippingId->" + shippingId); 
	
	shippingQuery.include("payment");
	shippingQuery.include("cargo");
	shippingQuery.include("flight");
	shippingQuery.get(shippingId).then(function(shipping){
	        var payment = shipping.get("payment");
			var cargo = shipping.get("cargo");
			var flight = shipping.get("flight");
			
			shipping.set("transferPaymentStatus",messageModule.PF_SHIPPING_PAYMENT_STATUS_CANCEL());
			shipping.save();
		
			payment.set("status",messageModule.PF_SHIPPING_PAYMENT_STATUS_CANCEL());
			payment.save().then(function (py){
			    cargo.fetch({include: "owner"},
						   {
							   success: function(cargoObj) {
							     var cargoUser = cargoObj.get("owner");
								 var newForzenMoney = cargoUser.get("forzenMoney") - payment.get("total");
								 console.log("Payment - PaymentApproveRefundRequest: cargoUser->"+cargoUser.id+" frozenMoney: before->" + cargoUser.get("forzenMoney") + ", after->" + newForzenMoney);
								 cargoUser.set("forzenMoney",newForzenMoney);
								 cargoUser.save().then(function(user){
									var totalAmount = payment.get("total");
									pushModule.PushPaymentChargeShippingListCancelToCargoUser(payment,totalAmount,shipping,cargoUser);
									pushModule.PushPaymentChargeShippingListCancelToFlightUser(payment,totalAmount,shipping,flight.get("owner"));
								 });
								},
							   error: function(message, error) {
								 console.log(error.message);
								 response.error(messageModule.errorMsg());
							    }
						   });
				response.success(payment);
			});
		}, function (error) {
			console.log(error.message);
			response.error(messageModule.errorMsg());
	});
   }
});

AV.Cloud.define("QueryWXOrder", function (request, response) {
    var out_trade_no = request.params.outTradeNo;
	
	console.log("Payment - QueryWXOrder: out_trade_no->" + out_trade_no);
	wxpay.queryOrder({ out_trade_no:out_trade_no }, function(err, order){
		console.log("Payment - QueryWXOrder result:"+ JSON.stringify(order));
        if(err != null)
          response.error(err);		
		else{
		    paymentCallback(order);
			console.log("return query result to APP: out_trade_no->" + out_trade_no);
			response.success(order);
		}
	});
});

var CreateTopupPayment = function (user, wxObj,params,type, response) {
	
	var Payment = AV.Object.extend(classnameModule.GetPaymentClass());
    var myPayment = new Payment();
	
	myPayment.set("paymentChannel", params.channel);
	myPayment.set("total", (params.amount/100));
	myPayment.set("status", messageModule.PF_SHIPPING_PAYMENT_STATUS_PENDING());
	myPayment.set("type", type);
	myPayment.set("user",user);
	myPayment.set("transactionNumber",wxObj.prepay_id);
	myPayment.set("orderNo",params.order_no);
	myPayment.save(null, {
	  success: function(payment) {
	    console.log("Payment - " + type + ": payment creation succeed: transactionNumber->" + wxObj.prepay_id + ", UserId->" + user.id + ", order_no->" + params.order_no + ", amount->"+(params.amount/100)); 
		//add payment history to user
		var paymentRelation = user.relation('paymentHistory');
		paymentRelation.add(payment);
		user.save();
		
		var obj = newAPPReturnObj(wxObj,params.order_no);
		response.success(obj);
	  },
	  error: function(message, error) {
		console.log(error.message);
		response.error(messageModule.errorMsg());
	  }
	});
};

var topupCallback = function(payment,data){
	payment.set("status",messageModule.PF_SHIPPING_PAYMENT_STATUS_SUCCESS());
	payment.set("transactionId",data.transaction_id);
	payment.save().then(function(result){
	    var user = payment.get("user");
		var amount = (parseInt(data.total_fee))/100;
	    var balance = user.get("totalMoney") + amount;
		console.log("paymentCallback: Payment - Topup: User->"+user.id+" totalMoney: before->" + user.get("totalMoney") + ", after->" + balance); 
		user.set("totalMoney",balance);
		user.save().then(function(result){
			console.log("paymentCallback: Payment - Topup success for user->" + user.id + " with transactionId-> " + data.transaction_id + " with amount->" + amount);
			pushModule.PushPaymentTopupSucceedToUser(payment,amount,user);
		},function (error) {
			console.log(error.message);
		});
	},function (error) {
		console.log(error.message);
	});
}


/*Withdraw*/
var CreateWithDrawPayment = function (user, wxObj,params,type, response) {
	
	var Payment = AV.Object.extend(classnameModule.GetPaymentClass());
    var myPayment = new Payment();
	
	myPayment.set("paymentChannel", params.channel);
	myPayment.set("total", (params.amount/100));
	myPayment.set("status", messageModule.PF_SHIPPING_PAYMENT_STATUS_PENDING());
	myPayment.set("type", type);
	myPayment.set("user",user);
	myPayment.set("orderNo",params.order_no);
	myPayment.save(null, {
	  success: function(payment) {
	    console.log("Payment - " + type + ": payment creation succeed: transactionId->" + wxObj.payment_no + ", UserId->" + user.id + ", order_no->" + params.order_no + ", amount->"+(params.amount/100)); 
		//add payment history to user
		var paymentRelation = user.relation('paymentHistory');
		paymentRelation.add(payment);
		user.save();
		if(wxObj.return_code === "SUCCESS"){
			withdrawCallback(payment,wxObj);
			response.success(wxObj);
		}
		else
		    response.error({code: wxObj.return_code, message: wxObj.return_msg});
	  },
	  error: function(message, error) {
		console.log(error.message);
		response.error(messageModule.errorMsg());
	  }
	});
};

//actually no callback from weixin
var withdrawCallback = function(payment,data){
	payment.set("status",messageModule.PF_SHIPPING_PAYMENT_STATUS_SUCCESS());
	payment.set("transactionId",data.payment_no);
	payment.save().then(function(result){
	    var user = payment.get("user");
		var amount = payment.get("total");
		var frozenBalance = user.get("forzenMoney") - amount;
		var totalBalance = user.get("totalMoney") - amount;
		console.log("withdrawCallback: Payment - Withdraw: User Id->"+user.id+" totalMoney: before->" + user.get("totalMoney") + ", after->" + totalBalance); 
		console.log("withdrawCallback: Payment - Withdraw: User Id->"+user.id+" frozenMoney: before->" + user.get("forzenMoney") + ", after->" + frozenBalance); 
		user.set("forzenMoney",frozenBalance);
		user.set("totalMoney",totalBalance);
		user.save().then(function(result){
			console.log("withdrawCallback: Payment - Withdraw success for user->" + user.id + " with transactionId-> " + data.payment_no + " with amount->" + amount);
			pushModule.PushWithdrawSucceedToUser(payment,amount,user);
		},function (error) {
			console.log(error.message);
		});
	},function (error) {
		console.log(error.message);
	});
}

/*shipping payment*/
var CreateShippingPayment = function (newpayment, wxObj, shippings, response) {
	
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
	myPayment.set("transactionNumber",wxObj.prepay_id);
	myPayment.set("orderNo",newpayment.order_no);
	myPayment.save(null, {
	  success: function(payment) {
	    console.log("Payment - " + newpayment.type + ": payment creation succeed: transactionNumber->" + wxObj.prepay_id + ", UserId->" + newpayment.user.id + ", order_no->" + newpayment.order_no); 
		
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
		var obj = newAPPReturnObj(wxObj,newpayment.order_no);
		response.success(obj);
	  },
	  error: function(message, error) {
		console.log(error.message);
		response.error(messageModule.errorMsg());
	  }
	});
};

var shippingChargeCallback = function(payment,data){
    var Shipping = AV.Object.extend(classnameModule.GetShippingClass());
    var shippingQuery = new AV.Query(Shipping);
			
	payment.set("status",messageModule.PF_SHIPPING_PAYMENT_STATUS_PROCESSING());
	payment.set("transactionId",data.transaction_id);
	payment.save().then(function(result){
	    var user = payment.get("user");
		var totalMoney = user.get("totalMoney") + (payment.get("total") - payment.get("usingBalance")); 
		console.log("shippingChargeCallback: Payment - PaymentChargeShippingList: User Id->"+user.id+" totalMoney: before->" + user.get("totalMoney") + ", after->" + totalMoney + ", payment Id->" + payment.id); 
		user.set('totalMoney',totalMoney);
		user.save().then(function(result){
			console.log("shippingChargeCallback: Payment - PaymentChargeShippingList success for user->" + user.id + " with transactionId-> " + data.transaction_id + " with total amount->" + payment.get("total") + " and using soontake balance->" + payment.get("usingBalance"));
			shippingQuery.equalTo("payment", payment);
			shippingQuery.include("cargo");
			shippingQuery.include("flight");
			shippingQuery.find({
					success: function (shippings) {
						// The object was retrieved successfully.
						for(var i=0; i<shippings.length; i++)
						{
							shippings[i].set("paymentStatus",messageModule.PF_SHIPPING_PAYMENT_STATUS_SUCCESS());
							shippings[i].save().then(function(shipping){
							    var totalAmount = payment.get("total");
								pushModule.PushChargeShippingListSucceedToCargoUser(payment,totalAmount,shipping,user);
								pushModule.PushChargeShippingListSucceedToFlightUser(payment,totalAmount,shipping,user);
							});
						}
					},
					error: function (error) {
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

/*shipping charge with balance*/
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
			shippings[i].set("paymentStatus",messageModule.PF_SHIPPING_PAYMENT_STATUS_SUCCESS());
			shippings[i].set("transferPaymentStatus",messageModule.PF_SHIPPING_PAYMENT_STATUS_PENDING());
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


/*Common function*/
var paymentCallback = function(order){
	var Payment = AV.Object.extend(classnameModule.GetPaymentClass());
    var paymentQuery = new AV.Query(Payment);
	
	paymentQuery.equalTo("orderNo", order.out_trade_no);
	paymentQuery.include("user");
	paymentQuery.find({
        success: function (payments) {
		     if(payments.length <= 0)
			 {
				console.log("paymentCallback: Unknown payment with out_trade_no: " + order.out_trade_no);
			 }
			 else
			 {
			    if(order.return_code != 'SUCCESS' || (order.err_code != null && order.err_code != ''))
				   console.log("paymentCallback: payment with out_trade_no: " + order.out_trade_no + " not successfully with error->"+ order.err_code + ", error_desc->" + order.err_code_des);
			    else
				{
				  var payment = payments[0];
				  switch (order.attach) {
					case messageModule.PF_SHIPPING_PAYMENT_TOPUP():
						topupCallback(payment,order);
					  break;
					case messageModule.PF_SHIPPING_PAYMENT_CHARGE():
						shippingChargeCallback(payment,order);
					  break;
					default:
					  return resp(returnFAILxml('Unknown Event type'), 400);
					  break;
				  }
			    }
			 }
        },
        error: function (error) {
            console.log(error.message);
        }
    });
}

var newAPPReturnObj = function (wxObj,out_trade_no){
	var newObj = {
		appid: APP_ID,
		noncestr: wxObj.nonce_str,
		package: 'Sign=WXPay',
		partnerid: MERCHANT_ID,
		prepayid: wxObj.prepay_id,
		timestamp: parseInt(Date.now()/1000),
		sign: '',
		outTradeNo: ''
	};
	var newSign = wxpay.sign(newObj);
	newObj.sign = newSign;
	newObj.outTradeNo = out_trade_no;
	console.log("Return to APP: " + JSON.stringify(newObj));
	return newObj;
}

AV.Cloud.define("AutoPaymentAfterPackageSentJob", function(request, response) {
    var Payment = AV.Object.extend(classnameModule.GetPaymentClass());
    var paymentQuery = new AV.Query(Payment);
	
	var Shipping = AV.Object.extend(classnameModule.GetShippingClass());
    var shippingQuery = new AV.Query(Shipping);
	
	var cql = "select include payment,* from "+ classnameModule.GetShippingClass()+" where status = '"+messageModule.ShippingStatus_Received()+"' AND transferPaymentStatus in ('" + messageModule.PF_SHIPPING_PAYMENT_STATUS_PENDING() + "','" + messageModule.PF_SHIPPING_PAYMENT_STATUS_REJECTREFUND() + "') AND paymentStatus='" + messageModule.PF_SHIPPING_PAYMENT_STATUS_SUCCESS() + "'";
	console.log("AutoPaymentAfterPackageSentJob cql->" + cql);
	AV.Query.doCloudQuery(cql).then(function (result) {
		  var shippings = result.results;
		  if(shippings.length <= 0)
			 {
				console.log("AutoPaymentAfterPackageSentJob: no payment to update");
				response.success(true);
			 }
	      else
			 {
				async.eachSeries(shippings, function(shipping, callback) {
				var payment = shipping.get("payment");
				if(payment != null && payment !='')
				{
					//var compareDate = new Date(new Date().getTime()-(7*24*60*60*1000));
					var compareDate = new Date(new Date().getTime()-(2*60*1000));
					if(payment.get("type") == messageModule.PF_SHIPPING_PAYMENT_CHARGE() && (compareDate >= payment.getCreatedAt()))
					{
					  console.log("AutoPaymentAfterPackageSentJob: payment->" + payment.id);
					  //call transfer to sender method
					  AV.Cloud.run('PaymentTransferToSender', { shippingId: shipping.id}, {
						success: function (paymentResult) {
							console.log("AutoPaymentAfterPackageSentJob: payment->" + payment.id + " succeed.");
							callback();
						},
						error: function (error) {
							console.log("AutoPaymentAfterPackageSentJob: payment->" + payment.id + " failed.");
						}
					  });
					}
				}
				}, function(err) {
					// if any of the file processing produced an error, err would equal that error
					if( err ) {
					  // One of the iterations produced an error.
					  // All processing will now stop.
					  console.log('A payment failed to process');
					} else {
					  console.log('All payment have been processed successfully');
					}
				});
				response.success(true);
			 }
	});
});

AV.Cloud.define("AutoPaymentRefundJob", function(request, response) {
    var Payment = AV.Object.extend(classnameModule.GetPaymentClass());
    var paymentQuery = new AV.Query(Payment);
	
	var Shipping = AV.Object.extend(classnameModule.GetShippingClass());
    var shippingQuery = new AV.Query(Shipping);
	
	shippingQuery.equalTo("status", messageModule.ShippingStatus_Received());
	shippingQuery.equalTo("transferPaymentStatus", messageModule.PF_SHIPPING_PAYMENT_STATUS_REQUESTREFUND());
	shippingQuery.equalTo("paymentStatus",messageModule.PF_SHIPPING_PAYMENT_STATUS_SUCCESS());
	shippingQuery.include("payment");
	shippingQuery.include("refundPayment");
	shippingQuery.include("cargo");
	shippingQuery.include("flight");
	shippingQuery.find({
        success: function (shippings) {
		     if(shippings.length <= 0)
			 {
				console.log("AutoPaymentRefundJob: no refund payment to update");
				response.success(true);
			 }
			 else
			 {
				async.eachSeries(shippings, function(shipping, callback) {
				 var refundPayment = shipping.get("refundPayment");
					if(refundPayment != null && refundPayment !='')
					{
						//var compareDate = new Date(new Date().getTime()-(7*24*60*60*1000));
						var compareDate = new Date(new Date().getTime()-(2*60*1000));
						if(refundPayment.get("type") == messageModule.PF_SHIPPING_PAYMENT_REFUND() && (compareDate >= refundPayment.getCreatedAt()))
						{
						  console.log("AutoPaymentRefundJob: refund payment->" + refundPayment.id);
						  //call approve refund method
						  AV.Cloud.run('PaymentApproveRefundRequest', { shippingId: shipping.id,reasonCode:'',reason:''}, {
							success: function (paymentResult) {
								console.log("AutoPaymentRefundJob: refund payment->" + refundPayment.id + " succeed.");
							},
							error: function (error) {
								console.log("AutoPaymentRefundJob: refund payment->" + refundPayment.id + " failed.");
							}
						  });
						}
					}
				}, function(err) {
					// if any of the file processing produced an error, err would equal that error
					if( err ) {
					  // One of the iterations produced an error.
					  // All processing will now stop.
					  console.log('A refund payment failed to process');
					} else {
					  console.log('All refund payment have been processed successfully');
					}
				});
				response.success(true);
			 }
        },
        error: function (error) {
            console.log(error.message);
			response.error(false);
        }
    });
});

AV.Cloud.define("PaymentUrgePaymentToSender", function (request, response) {
    var shippingList = request.params.shippingList;
	
	var Payment = AV.Object.extend(classnameModule.GetPaymentClass());
	var paymentQuery = new AV.Query(Payment);
	
	var Shipping = AV.Object.extend(classnameModule.GetShippingClass());
    var shippingQuery = new AV.Query(Shipping);
	
    for(var s=0; s <shippingList.length; s++)
    {	
	var shippingId = shippingList[s];
	console.log("Payment - PaymentUrgePaymentToSender: shippingId->" + shippingId); 
	
	shippingQuery.include("payment");
	shippingQuery.include("cargo");
	shippingQuery.include("flight");
	shippingQuery.get(shippingId).then(function(shipping){
	        var payment = shipping.get("payment");
			var cargo = shipping.get("cargo");
			var flight = shipping.get("flight");
			
			if(shipping.get("paymentStatus") == messageModule.PF_SHIPPING_PAYMENT_STATUS_PENDING())
			   response.error({code: 110, message: "寄货人已经付款"});
		    else
			{
			   cargo.fetch({include: "owner"},
				   {
					   success: function(cargoObj) {
						 var cargoUser = cargoObj.get("owner");
						 var totalAmount = payment.get("total");
						 pushModule.PushPaymentUrgePaymentToCargoUser(payment,totalAmount,shipping,cargoUser);
						},
					   error: function(message, error) {
						 console.log(error.message);
						 response.error(messageModule.errorMsg());
						}
				   });
		       response.success(payment);
			}
		}, function (error) {
			console.log(error.message);
			response.error(messageModule.errorMsg());
	});
   }
});