//cargo message
var cargoLookupFailed = "Cargo lookup failed";
var flightLookupFailed = "Flight lookup failed";

var cargoProcessing = "Cargo has been processing";
var cargoWeightNotEnough = "Cargo can't be assign due to weight not enough";

var flightFull = "Flight can't be assign due to space not enough";

var succeedIndicator = '1';
var errorIndicator = '0';

var splitor = '|';

var succeedMsg = "succeed";
var errorMsg = "error";

var appName = "com.soontake.client";

//Query Limit
var queryLimit = 20;

//Shipping status
var ShippingStatus_Pending = "pending";
var ShippingStatus_Processing = "processing";
var ShippingStatus_Sending = "sending";
var ShippingStatus_Received = "completed";
var ShippingStatus_Cancel = "cancel";

//Cargo status
var CargoStatus_Pending = "pending";
var CargoStatus_Processing = "processing";
var CargoStatus_Completed = "completed";
var CargoStatus_Sending = "sending";
var CargoStatus_Received = "received";
var CargoStatus_Cancel = "cancel";

//Flight status
var FlightStatus_Pending = "pending";
var FlightStatus_Overdue = "overdue";
var FlightStatus_Completed = "completed";
var FlightStatus_Full = "full";

//user approve status
var PF_USERDETAILS_STATUS_APPROVED = "approved";
var PF_USERDETAILS_STATUS_REJECTED = "rejected";
var PF_USERDETAILS_STATUS_PENDING = "pending";

//assign type

var Assign_Type_Cargo = "cargo";
var Assign_Type_Flight = "flight";

var YES = 'YES';
var NO = 'NO';

var UserNotFound = "User not found";
var ConfigNotFound = "Config not found";

var expressPost = "post";
var expressCollect = "collect";

//payment
var PF_SHIPPING_PAYMENT_STATUS_PENDING ="pending"//付款中

var PF_SHIPPING_PAYMENT_STATUS_CANCEL ="cancel"; //付款中途取消

var PF_SHIPPING_PAYMENT_STATUS_REJECTED ="rejected" // 用户取消转钱给代运人

var PF_SHIPPING_PAYMENT_STATUS_PROCESSING ="processing" //等待货主同意支付给代运人

var PF_SHIPPING_PAYMENT_STATUS_SUCCESS ="success";

var PF_SHIPPING_PAYMENT_STATUS_FAILED ="failed";

var PF_SHIPPING_PAYMENT = "payment"; //付款到平台的交易信息

var PF_SHIPPING_TRANSFER_PAYMENT = "transferPayment"; // 平台到代运人的转账信息

var PF_SHIPPING_PAYMENT_TOPUP = "topup"; 

var PF_SHIPPING_PAYMENT_WITHDRAW = "withdraw"; 

var PF_SHIPPING_PAYMENT_CHARGE = "charge"; 

var PF_SHIPPING_PAYMENT_REFUND = "refund"; 

var PF_SHIPPING_PAYMENT_STATUS_REQUESTREFUND = "requestRefund";

var PF_SHIPPING_PAYMENT_STATUS_REJECTREFUND = "rejectRefund";

var PF_SHIPPING_PAYMENT_STATUS_APPROVEREFUND = "refunded";

var PF_SHIPPING_PAYMENT_STATUS_CANCELREFUND = "cancel";

var PF_SHIPPING_PAYMENT_CHANNEL_WEIXIN = "wx";

var PF_SHIPPING_PAYMENT_CHANNEL_ALIPAY = "alipay";


//error message
var PF_SHIPPING_PAYMENT_ERROR_SENDNUM_LIMIT = "SENDNUM_LIMIT";

var PF_SHIPPING_PAYMENT_ERROR_FREQ_LIMIT = "FREQ_LIMIT";

var PF_SHIPPING_PAYMENT_ERROR_NOTENOUGH = "NOTENOUGH";

//public method
exports.PF_SHIPPING_PAYMENT_ERROR_NOTENOUGH = function () {
    return PF_SHIPPING_PAYMENT_ERROR_NOTENOUGH;
}
exports.PF_SHIPPING_PAYMENT_ERROR_FREQ_LIMIT = function () {
    return PF_SHIPPING_PAYMENT_ERROR_FREQ_LIMIT;
}
exports.PF_SHIPPING_PAYMENT_REFUND = function () {
    return PF_SHIPPING_PAYMENT_REFUND;
}
exports.PF_SHIPPING_PAYMENT_ERROR_SENDNUM_LIMIT = function () {
    return PF_SHIPPING_PAYMENT_ERROR_SENDNUM_LIMIT;
}
exports.PF_SHIPPING_PAYMENT_STATUS_CANCELREFUND = function () {
    return PF_SHIPPING_PAYMENT_STATUS_CANCELREFUND;
}
exports.PF_SHIPPING_PAYMENT_CHANNEL_WEIXIN = function () {
    return PF_SHIPPING_PAYMENT_CHANNEL_WEIXIN;
}
exports.PF_SHIPPING_PAYMENT_CHANNEL_ALIPAY = function () {
    return PF_SHIPPING_PAYMENT_CHANNEL_ALIPAY;
}
exports.PF_SHIPPING_PAYMENT_STATUS_PENDING = function () {
    return PF_SHIPPING_PAYMENT_STATUS_PENDING;
}
exports.PF_SHIPPING_PAYMENT_STATUS_CANCEL = function () {
    return PF_SHIPPING_PAYMENT_STATUS_CANCEL;
}
exports.PF_SHIPPING_PAYMENT_STATUS_REJECTED = function () {
    return PF_SHIPPING_PAYMENT_STATUS_REJECTED;
}
exports.PF_SHIPPING_PAYMENT_STATUS_SUCCESS = function () {
    return PF_SHIPPING_PAYMENT_STATUS_SUCCESS;
}
exports.PF_SHIPPING_PAYMENT_STATUS_FAILED = function () {
    return PF_SHIPPING_PAYMENT_STATUS_FAILED;
}
exports.PF_SHIPPING_PAYMENT = function () {
    return PF_SHIPPING_PAYMENT;
}
exports.PF_SHIPPING_TRANSFER_PAYMENT = function () {
    return PF_SHIPPING_TRANSFER_PAYMENT;
}
exports.PF_SHIPPING_PAYMENT_TOPUP = function () {
    return PF_SHIPPING_PAYMENT_TOPUP;
}
exports.PF_SHIPPING_PAYMENT_WITHDRAW = function () {
    return PF_SHIPPING_PAYMENT_WITHDRAW;
}
exports.PF_SHIPPING_PAYMENT_CHARGE = function () {
    return PF_SHIPPING_PAYMENT_CHARGE;
}
exports.PF_SHIPPING_PAYMENT_STATUS_PROCESSING = function () {
    return PF_SHIPPING_PAYMENT_STATUS_PROCESSING;
}
exports.PF_SHIPPING_PAYMENT_STATUS_REQUESTREFUND = function () {
    return PF_SHIPPING_PAYMENT_STATUS_REQUESTREFUND;
}
exports.PF_SHIPPING_PAYMENT_STATUS_REJECTREFUND = function () {
    return PF_SHIPPING_PAYMENT_STATUS_REJECTREFUND;
}
exports.PF_SHIPPING_PAYMENT_STATUS_APPROVEREFUND = function () {
    return PF_SHIPPING_PAYMENT_STATUS_APPROVEREFUND;
}


exports.Assign_Type_Cargo = function () {
    return Assign_Type_Cargo;
}

exports.Assign_Type_Flight = function () {
    return Assign_Type_Flight;
}

exports.expressPost = function () {
    return expressPost;
}

exports.expressCollect = function () {
    return expressCollect;
}

exports.YES = function () {
    return YES;
}

exports.NO = function () {
    return NO;
}

exports.PF_USERDETAILS_STATUS_APPROVED = function () {
    return PF_USERDETAILS_STATUS_APPROVED;
}

exports.PF_USERDETAILS_STATUS_REJECTED = function () {
    return PF_USERDETAILS_STATUS_REJECTED;
}

exports.PF_USERDETAILS_STATUS_PENDING = function () {
    return PF_USERDETAILS_STATUS_PENDING;
}

exports.cargoLookupFailed = function () {
    return cargoLookupFailed;
}

exports.flightLookupFailed = function () {
    return flightLookupFailed;
}

exports.cargoProcessing = function () {
    return cargoProcessing;
}

exports.cargoWeightNotEnough = function () {
    return cargoWeightNotEnough;
}

exports.flightFull = function () {
    return flightFull;
}

exports.succeedIndicator = function () {
    return succeedIndicator;
}

exports.errorIndicator = function () {
    return errorIndicator;
}

exports.splitor = function () {
    return splitor;
}

exports.succeedMsg = function () {
    return succeedMsg;
}

exports.errorMsg = function () {
    return errorMsg;
}

exports.queryLimit = function () {
    return queryLimit;
}

exports.ShippingStatus_Pending = function () {
    return ShippingStatus_Pending;
}

exports.ShippingStatus_Processing = function () {
    return ShippingStatus_Processing;
}

exports.ShippingStatus_Sending = function () {
    return ShippingStatus_Sending;
}

exports.ShippingStatus_Received = function () {
    return ShippingStatus_Received;
}

exports.ShippingStatus_Cancel = function () {
    return ShippingStatus_Cancel;
}


exports.CargoStatus_Pending = function () {
    return CargoStatus_Pending;
}

exports.CargoStatus_Processing = function () {
    return CargoStatus_Processing;
}

exports.CargoStatus_Completed = function () {
    return CargoStatus_Completed;
}

exports.CargoStatus_Sending = function () {
    return CargoStatus_Sending;
}

exports.CargoStatus_Received = function () {
    return CargoStatus_Received;
}

exports.CargoStatus_Cancel = function () {
    return CargoStatus_Cancel;
}

exports.FlightStatus_Pending = function () {
    return FlightStatus_Pending;
}

exports.FlightStatus_Overdue = function () {
    return FlightStatus_Overdue;
}

exports.FlightStatus_Completed = function () {
    return FlightStatus_Completed;
}

exports.FlightStatus_Full = function () {
    return FlightStatus_Full;
}

exports.appName = function () {
    return appName;
}

exports.UserNotFound = function () {
    return UserNotFound;
}

exports.ConfigNotFound = function () {
    return ConfigNotFound;
}