#!/bin/bash

# take the profile, region and the account as parameters
POSITIONAL=()
while [[ $# -gt 0 ]]
do
key="$1"

case $key in
  --account)
  ACCOUNT="$2"
  shift # past argument
  shift # past value
  ;;
  --region)
  REGION="$2"
  shift # past argument
  shift # past value
  ;;
  --profile)
  PROFILE="$2"
  shift # past argument
  shift # past value
  ;;
esac
done
set -- "${POSITIONAL[@]}" # restore positional parameters

withProfile=""
if [ ! -z $PROFILE ];
then
    withProfile=" --profile $PROFILE"
fi

# Both parameters are required, fail if they are absent
if [ -z $ACCOUNT ] && [ -z $REGION ];
then
  echo "Both --account and --region are required"
  exit 0
elif [ -z $ACCOUNT ]
then
  echo "--account is required"
  exit 0
elif [ -z $REGION ]
then
  echo "--region is required"
  exit 0
fi

COMMAND="aws codeartifact get-authorization-token${withProfile} --domain voicefoundry-cloud --domain-owner $ACCOUNT --query authorizationToken --output text --region $REGION"
TOKEN=$(eval $COMMAND)
CURRENT_DIR=$(pwd)

function makeNpmrc () {
  TARGET_DIR="$CURRENT_DIR/$1"
  cd $TARGET_DIR
  echo "registry=https://registry.npmjs.org 
  @voicefoundry-cloud:registry=https://voicefoundry-cloud-$ACCOUNT.d.codeartifact.$REGION.amazonaws.com/npm/vf/
  //voicefoundry-cloud-$ACCOUNT.d.codeartifact.$REGION.amazonaws.com/npm/vf/:always-auth=true
  //voicefoundry-cloud-$ACCOUNT.d.codeartifact.$REGION.amazonaws.com/npm/vf/:_authToken="$TOKEN > .npmrc
}

DIRS=("./ ")
for FILE in ./packages/*; do
    [[ -d $FILE ]] && DIRS+="$FILE "
done

for DIR in $DIRS; do
  makeNpmrc $DIR
done

cd $CURRENT_DIR


