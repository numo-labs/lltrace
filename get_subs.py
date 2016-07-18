import boto3
import os
import pprint
import sys

pp = pprint.PrettyPrinter(indent=2)

key_id = os.environ.get('AWS_ACCESS_KEY_ID')
access_key = os.environ.get('AWS_SECRET_ACCESS_KEY')

client = boto3.client(
    's3',
    aws_access_key_id=key_id,
    aws_secret_access_key=access_key)
s3 = boto3.resource(
    's3',
    aws_access_key_id=key_id,
    aws_secret_access_key=access_key)

buckets = client.list_buckets()

#
# S3 Bucket events
#
for bucket in buckets['Buckets']:
    name = bucket['Name']
    notification = s3.BucketNotification(name)
    function_configs = notification.lambda_function_configurations
    topic_configs = notification.topic_configurations
    queue_configs = notification.queue_configurations

    if function_configs or topic_configs or queue_configs:
        if function_configs:
            for config in function_configs:
                print "s3:%s,%s" % (
                    name,
                    config['LambdaFunctionArn'].split('function:')[-1])

        # if topic_configs:
        #     print 'Topics:'
        #     print topic_configs
        #     print
        # if queue_configs:
        #     print 'Queues:'
        #     print queue_configs
        #     print

sns = boto3.client(
    'sns',
    aws_access_key_id=key_id,
    aws_secret_access_key=access_key)
paginator = sns.get_paginator('list_subscriptions')
response_iterator = paginator.paginate()

paginator2 = sns.get_paginator('list_topics')
iterator2 = paginator2.paginate()
topicArns = []
for res in iterator2:
    #pp.pprint(res)
    for topic in res['Topics']:
        topicArns.append(topic['TopicArn'])

#pp.pprint(topicArns)

# Lambda subscriptions to SNS topics:
#
non_existent_subs = []

for res in response_iterator:
    #pp.pprint(res)
    for sub in res.get('Subscriptions', []):
        if sub.get('Protocol') == 'lambda':
            if sub['TopicArn'] in topicArns:
                print '%s,%s' % (
                    sub['TopicArn'],
                    sub['Endpoint'].split('function:')[-1])
            else:
                non_existent_subs.append(sub['SubscriptionArn'])

if len(non_existent_subs) > 0:
    sys.stderr.write('\n\n********** Found subscriptions with non-existent topics **********\n')
    for x in non_existent_subs:
        sys.stderr.write('%s\n' % x)
