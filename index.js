"use strict";

const git = require("git-rev-2"),
  ec2 = require("node-ec2-metadata");

function promisify(fn) {
  return new Promise((resolve, reject) => {
    fn((err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
}

function getEc2() {
  const aws = {
    instanceId: "localhost",
    amiId: "localhost"
  };

  return ec2.isEC2()
    .then((onEc2) => {
      if (onEc2) {
        return Promise.all([
          ec2.getMetadataForInstance("instance-id"),
          ec2.getMetadataForInstance("ami-id")
        ]).
        then((results) => {
          return {
            instanceId: results[0],
            amiId: results[1]
          }
        })
        .catch((err) => {
          return aws;
        });
      } else {
        return aws;
      }
    });
}

function getGit() {
  const short = promisify(git.short),
    long = promisify(git.long),
    branch = promisify(git.branch);

  return Promise.all([short, long, branch])
    .then((results) => {
      return {
        short: results[0],
        long: results[1],
        branch: results[2]
      };
    });
}

function getEnv() {
  return (process && process.env) ? process.env.NODE_ENV : undefined;
}

function get() {
  const git = getGit(),
    ecs = getEc2();

  return Promise.all([git, ecs])
    .then((results) => {
      return {
        git: results[0],
        aws: results[1],
        env: {
          nodeEnv: getEnv()
        }
      }
    });
}

exports.getInfo = () => {
  return get();
};
