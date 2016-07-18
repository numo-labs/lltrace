var AWS = require('aws-sdk');
var format = require('util').format;

function guessType (id) {
  if (id.startsWith('s3:')) {
    return 's3';
  } else if (/:sns:/.test(id)) {
    return 'sns';
  } else {
    return 'lambda'; // FIXME: not actually very reliable
  }
}

//
// Turn something like:
// "arn:aws:sns:eu-west-1:8xxxxxxxxxxx2:search-request-v1-ci"
// into just "search-request-v1-ci"
//
function shortName (id) {
  var type = guessType(id);
  if (type === 's3') {
    return id.substr(3, id.length);
  } else if (type === 'sns') {
    var parts = id.split(':');
    return parts[parts.length - 1];
  } else if (type === 'lambda') {
    if (false && id.indexOf(':') !== -1) {
      return 'λ:' + id.split(':')[id.split(':').length - 1];
    } else {
      return 'λ:' + id;
    }
  } else {
    return id;
  }
}

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
          id: shortName(item.lambda.S),
          type: guessType(item.lambda.S)
        };

        if (graph.nodes.findIndex(function (n) { return n.id === node.id; }) > -1) {
          // Already Exists
        } else {
          graph.nodes.push(node);
        }

        var link = {
          source: shortName(item.lambda.S),
          target: shortName(item.destination.S)
        };

        if (graph.nodes.findIndex(function (n) { return n.id === link.target; }) > -1) {
          // Already Exists
        } else {
          graph.nodes.push({ id: link.target, type: guessType(item.destination.S) });
        }
        graph.links.push(link);
      }
    });
    callback(null, graph);
  });
};
