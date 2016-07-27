//******Varibales Definition******//
var classnameModule = require('./classname');
var messageModule = require('./message');
var pushModule = require('./pushmessage');
var AV = require('leanengine');
var crypto = require('crypto');
//var WXPay = require('weixin-pay');
var WXPay = require('./wxpay');
var fs  = require("fs");

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
				if(err != null || charge.return_code != 'SUCCESS'){
			     console.log("Payment - Topup: charge creation error, order_no->" + order_no );
				 console.log(err);
				 response.error(err.message);
				}
				else
				{
				  CreateTopupPayment(user,charge,params,messageModule.PF_SHIPPING_PAYMENT_TOPUP(),response);
				}
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
		else if(users[0].get("totalMoney") < (amount/100))
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
					user.set("forzenMoney",FrozenMoney);
					user.save();
				    var openId = wechatInfo.get("openId");
					wxpay.createBusinessPayToWeixin({
						desc: 'Soontake 取款',
						partner_trade_no: order_no,
						openid: openId,
						check_name: 'OPTION_CHECK',
						re_user_name: user.get("details").get("realname"),
						amount: amount,
						spbill_create_ip: ip
					}, function(err, charge){
						console.log(charge);
						if(err != null || charge.return_code != 'SUCCESS'){
						 console.log("Payment - WithdrawToWechat: charge creation error, order_no->" + order_no );
						 console.log(err);
						 response.error(err.message);
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

AV.Cloud.define("QueryWXOrder", function (request, response) {
    var out_trade_no = request.params.outTradeNo;
	
	console.log("Payment - QueryWXOrder: out_trade_no->" + out_trade_no);
	wxpay.queryOrder({ out_trade_no:out_trade_no }, function(err, order){
		console.log("Payment - QueryWXOrder result:"+ JSON.stringify(order));
        if(err != null)
          response.error(err);		
		else{
		    paymentCallback(order);
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

var withdrawCallback = function(payment,data){
	payment.set("status",messageModule.PF_SHIPPING_PAYMENT_STATUS_SUCCESS());
	payment.set("transactionId",data.payment_no);
	payment.save().then(function(result){
	    var user = payment.get("user");
		var amount = payment.get("total");
		var frozenBalance = user.get("forzenMoney") - amount;
		var totalBalance = user.get("totalMoney") - amount;
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
			    if(order.return_code === 'SUCCESS'){
				  var payment = payments[0];
				  switch (order.attach) {
					case messageModule.PF_SHIPPING_PAYMENT_TOPUP():
						topupCallback(payment,order);
					  break;
					case messageModule.PF_SH:
						topupCallback(payment,order);
					  break;
					default:
					  return resp(returnFAILxml('Unknown Event type'), 400);
					  break;
				  }
			    }
				else
				 console.log("paymentCallback: payment with out_trade_no: " + order.out_trade_no + " not successfully");
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
