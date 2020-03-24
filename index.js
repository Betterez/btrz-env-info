const git = require("git-rev-2");
const ec2 = require("node-ec2-metadata");

const DEFAULT_EC2_QUERY_TIMEOUT_MS = 10000;
const TIMED_OUT = "TIMED_OUT";


function timeout(ms) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(TIMED_OUT), ms);
  });
}


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

async function getEc2(timeoutMs = DEFAULT_EC2_QUERY_TIMEOUT_MS) {
  const localEc2Config = {
    instanceId: "localhost",
    amiId: "localhost"
  };

  const result = await Promise.race([ec2.isEC2(), timeout(timeoutMs)]);

  if (result === TIMED_OUT) {
    return localEc2Config;
  }

  const isRunningOnEc2 = result;
  if (!isRunningOnEc2) {
    return localEc2Config;
  }

  try {
    const [instanceId, amiId] = await Promise.all([
      ec2.getMetadataForInstance("instance-id"),
      ec2.getMetadataForInstance("ami-id")
    ]);

    return {
      instanceId,
      amiId
    };
  } catch (err) {
    return {
      instanceId: "error getting aws info",
      amiId: "error getting aws info"
    };
  }
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
    })
    .catch((err) => {
      return {
        short: "error getting git info",
        long: "error getting git info",
        branch: "error getting git info"
      };
    });
}

function getEnv() {
  return (process && process.env) ? process.env.NODE_ENV : undefined;
}

function get(timeoutMs) {
  const git = getGit(),
    ecs = getEc2(timeoutMs);

  return Promise.all([git, ecs])
    .then((results) => {
      return {
        git: results[0],
        aws: results[1],
        env: {
          nodeEnv: getEnv()
        }
      }
    })
    .catch((err) => {
      return {
        git: "error getting info",
        aws: "error getting info",
        env: {
          nodeEnv: getEnv()
        }
      }
    });
}

exports.getInfo = (timeoutMs) => {
  return get(timeoutMs);
};
