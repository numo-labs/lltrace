var AWS = require('aws-sdk');
var format = require('util').format;

var dynamo = new AWS.DynamoDB({
  apiVersion: '2012-08-10',
  region: 'eu-west-1'
});

var params = {
  TableName: 'lltrace',
  AttributesToGet: ['Caller', 'Target', 'Type'],
  /*ScanFilter: {
    type: {
      ComparisonOperator: 'EQ',
      AttributeValueList: [
        { S: 'sns'}
      ]
    }
  }*/
};

dynamo.scan(params, function (err, data) {
  if (err) { console.log(err); return; };
  var seen = [];
  data.Items.forEach(function (item) {
    var mapping = format('%s,%s:%s', item.Caller.S, item.Type.S, item.Target.S);
    if (seen.indexOf(mapping) === -1) {
      console.log(mapping);
      seen.push(mapping);
    }
  });
});
