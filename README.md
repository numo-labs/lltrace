# lltrace

```
                   V
                  /'>>>
                 /*/
                / /
               /*/
              / /  _ _ _ _
      -------/*/   | | | |_ _ __ __ _  ___ ___
   --/  *  * */    | | | __| '__/ _` |/ __/ _ \
    /* * *  */     | | | |_| | | (_| | (_|  __/
    -  --- -/      |_|_|\__|_|  \__,_|\___\___|
     H    H
     H    H
     --   --
```

## Purpose

`lltrace` is a tool for visualizing the architecture of your serverless app.
It's a diagram of your lambdas, SNS topics and S3 buckets and their interactions
that never goes out of date.


## Pre-requisites

1. You need to use [`lltrace-aws-sdk`](https://github.com/numo-labs/lltrace-aws-sdk) in you lambdas
2. You should have Python & Boto3 and Mermaid (plus PhantomJS)

## Usage

Run:

```
make viz
```
