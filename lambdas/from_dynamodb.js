var AWS = require('aws-sdk');
var format = require('util').format;

module.exports.handler = function (event, context, callback) {
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
  function shortName (id, type) {
    if (type === 's3') {
      return id;
    } else if (type === 'sns') {
      var parts = id.split(':');
      return parts[parts.length - 1];
    } else if (type === 'lambda') {
      if (id.split(':')[0] === context.invokedFunctionArn.split(':')[4]) {
        var res = id.split(':');
        res.shift();
        return res.join(':');
      }
      if (false && id.indexOf(':') !== -1) {
        return id.split(':')[id.split(':').length - 1];
      } else {
        return id;
      }
    } else {
      return id;
    }
  }

  var dynamo = new AWS.DynamoDB({
    apiVersion: '2012-08-10',
    region: 'eu-west-1'
  });

  var params = {
    TableName: 'lltrace',
    AttributesToGet: ['Caller', 'Target', 'Type']
  };

  var lambda = new AWS.Lambda({
    region: 'eu-west-1'
  });

  var p = {
    FunctionName: 'get-subs',
    InvocationType: 'RequestResponse',
    Payload: JSON.stringify({}),
    Qualifier: '$LATEST',
    LogType: 'None'
  };

  lambda.invoke(p, function (err, data) {
    if (err) {
      return callback(err);
    }
    var payload = JSON.parse(data.Payload);

    payload = payload.map(row => ({ Caller: { S: row.split(',')[0] }, Target: { S: row.split(',')[1] }, Type: { S: guessType(row.split(',')[1]) } }));
    console.log('>>', payload);
    dynamo.scan(params, function (err, data) {
      if (err) {
        console.error(err);
        return callback(err);
      }
      var seen = [];
      var graph = {
        nodes: [],
        links: []
      };

      data.Items = data.Items.concat(payload);

      data.Items.forEach(function (item) {
        // console.log(item)
        var mapping = format('%s,%s', item.Caller.S, item.Target.S);
        if (seen.indexOf(mapping) === -1) {
        //   console.log(mapping);
          seen.push(mapping);

          var node = {
            id: shortName(item.Caller.S, guessType(item.Caller.S)),
            type: guessType(item.Caller.S)
          };

          if (graph.nodes.findIndex(function (n) { return n.id === node.id; }) > -1) {
            // Already Exists
          } else {
            graph.nodes.push(node);
          }

          var link = {
            source: node.id,
            target: shortName(item.Target.S, item.Type.S)
          };

          if (graph.nodes.findIndex(function (n) { return n.id === link.target; }) > -1) {
            // Already Exists
          } else {
            graph.nodes.push({ id: link.target, type: item.Type.S });
          }

          graph.links.push(link);
        }
      });
      callback(null, graph);
    });
  });
};
