var AV = require('leanengine');

require('./cloud/classname');
require('./cloud/message');
require('./cloud/function');
require('./cloud/pushmessage');
require('./cloud/hook');

module.exports = AV.Cloud;
