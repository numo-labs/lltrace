import json
import boto3

def get_subs():
    client = boto3.client('s3')
    s3 = boto3.resource('s3')
    result = []
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
                    result.append("s3:%s,%s" % (
                        name,
                        config['LambdaFunctionArn'].split('function:')[-1]) )

    sns = boto3.client('sns')
    paginator = sns.get_paginator('list_subscriptions')
    response_iterator = paginator.paginate()
    
    paginator2 = sns.get_paginator('list_topics')
    iterator2 = paginator2.paginate()
    topicArns = []
    for res in iterator2:
        for topic in res['Topics']:
            topicArns.append(topic['TopicArn'])
    
    #
    # Lambda subscriptions to SNS topics:
    #
    non_existent_subs = []
    
    for res in response_iterator:
        for sub in res.get('Subscriptions', []):
            if sub.get('Protocol') == 'lambda':
                if sub['TopicArn'] in topicArns:
                    result.append( '%s,%s' % (
                        sub['TopicArn'],
                        sub['Endpoint'].split('function:')[-1]))
                else:
                    non_existent_subs.append(sub['SubscriptionArn'])
    
    return result
    # TODO: Report these
    #if len(non_existent_subs) > 0:
    #    sys.stderr.write('\n\n********** Found subscriptions with non-existent topics **********\n')
    #    for x in non_existent_subs:
    #        sys.stderr.write('%s\n' % x)
    #print('Loading function')


def lambda_handler(event, context):
    subs = get_subs()
    print subs
    return subs
    
