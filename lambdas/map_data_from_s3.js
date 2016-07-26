var AWS = require('aws-sdk');
var A = require('async');

module.exports = {
  handler: handler
};

function handler(event, context, callback) {
  var s3 = new AWS.S3();
  var account = context.invokedFunctionArn.split(':')[4];
  var BUCKET = 'lltrace-' + account;
  var cache;

  A.waterfall([
    getCache,
    findNewEntries,
    updateCache,
    saveCache
  ], function allDone(err, cache) {
    return callback(null, cache);
  });

  /**
   * Get cached map data if it exists, return an empty map if not.
   */
  function getCache(next) {
    s3.getObject({
      Bucket: BUCKET,
      Key: 'cache.json'
    }, function(err, resp) {
      if (err) {
        cache = {
          updatedOn: Infinity,
          nodes: [],
          links: []
        };
      } else {
        cache = JSON.parse(resp.Body);
      }
      return next(null, cache);
    });
  }

  /**
   * Finds log entries (S3 objects) that were created after cache.updatedOn
   */
  function findNewEntries(cache, next) {
    s3.listObjectsV2({
      Bucket: BUCKET,
      Prefix: 'eu-west-1'
    }, function(err, resp) {
      if (err) {
        return next(err);
      }

      var newItems = resp.Contents.filter(function(item) {
        return new Date(item.LastModified).getTime() > cache.updatedOn;
      });

      return next(null, { cache: cache, newItems: newItems });
    });
  }

  /**
   * Updates cache with information from newItems.
   */
  function updateCache(args, next) {
    A.each(
      args.newItems,
      function(item, done) {
        s3.getObject({
          Bucket: BUCKET,
          Key: item.Key
        }, function(err, resp) {
          if (err) {
            return done(err);
          }
          var logEntry = JSON.parse(resp.Body);

          cache.nodes.push({id: logEntry.Caller, type: logEntry.Type});
          cache.links.push({source: logEntry.Caller, target: logEntry.Target });
        });
      },
      function allDone(err) {
        if (err) {
          return next(err);
        } else {
          return next(null, cache);
        }
      });
  }

  /**
   * Updates cache in S3
   */
  function saveCache(cache, next) {
    S3.putObject({
      Bucket: BUCKET,
      Key: 'cache.json',
      Body: JSON.stringify(cache, null, 4),
      ContentType: 'application/json'
    }, function (err, data) {
      if (err) {
        return next(err);
      }
      return next(null, cache);
    });
  }
}
