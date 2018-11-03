### Usage

```
Resources:
  S3FileLambdaFunction:
    Type: AWS::CloudFormation::Stack
    Properties:
      TemplateURL: !!Custom mkdir -p .tmp && rm -rf .tmp/cf_s3_creator && git clone --quiet https://github.com/sashee/cf_s3_creator.git .tmp/cf_s3_creator && echo ".tmp/cf_s3_creator/cloudformation.yml"
      Parameters:
        Buckets: !Join
          - ","
          - - !Sub
              - "${BucketArn}/*"
              - {BucketArn: !GetAtt Bucket.Arn}
  S3File:
    Type: Custom::S3File
    Properties:
      ServiceToken: !GetAtt S3FileLambdaFunction.Outputs.Arn
      Bucket: !Ref Bucket
      KeyPrefix: "examplekey"
      KeySuffix: ".txt"
      Content: "Hello world"
  Bucket:
    Type: AWS::S3::Bucket
```

And build with:

```
mkdir -p .tmp && cat cloudformation.yml | sed -r 's@(.*)(!!Custom )(.*)@echo "\1$(\3)"@ge'> .proc.yml && aws cloudformation package --template-file .proc.yml --s3-bucket <bucket> --output-template-file .tmp/output.yml && aws cloudformation deploy --template-file .tmp/output.yml --stack-name <stackname> --capabilities CAPABILITY_IAM && rm .proc.yml && rm -rf .tmp
```
