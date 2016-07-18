var AWS = require('aws-sdk');
var format = require('util').format;

module.exports.handler = function (event, context, callback) {
  var dynamo = new AWS.DynamoDB({
    apiVersion: '2012-08-10',
    region: 'eu-west-1'
  });

  var params = {
    TableName: 'lltracer',
    AttributesToGet: ['lambda', 'destination', 'type']
    /* ScanFilter: {
      type: {
        ComparisonOperator: 'EQ',
        AttributeValueList: [
          { S: 'sns'}
        ]
      }
    }*/
  };

  dynamo.scan(params, function (err, data) {
    if (err) {
      return callback(err);
    }
    var seen = [];
    var graph = {
      nodes: [],
      links: []
    };
    data.Items.forEach(function (item) {
      var mapping = format('%s,%s', item.lambda.S, item.destination.S);
      if (seen.indexOf(mapping) === -1) {
        seen.push(mapping);

        var node = {
          id: item.lambda.S
        };

        if (graph.nodes.findIndex(function (n) { return n.id === node.id; }) > -1) {
          // Already Exists
        } else {
          graph.nodes.push(node);
        }

        var link = {
          source: item.lambda.S,
          target: item.destination.S
        };

        if (graph.nodes.findIndex(function (n) { return n.id === link.target; }) > -1) {
          // Already Exists
        } else {
          graph.nodes.push({ id: link.target });
        }
        graph.links.push(link);
      }
    });
    callback(null, graph);
  });
};
