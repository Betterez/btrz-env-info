/**
DO NOT REMOVE THIS NOTICE

With code extracted from the node_ec2-metadata package
With code extracted from the git-rev-2 package

*/

const dns = require("dns");
const http = require("http");
const {
  exec
} = require("child_process");

const DEFAULT_EC2_QUERY_TIMEOUT_MS = 10000;
const TIMED_OUT = "TIMED_OUT";
const BASE_URL = "http://169.254.169.254/latest/";

async function _command(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, {
      cwd: __dirname
    }, (err, stdout, _stderr) => {
        if (err) {
        reject(err);
        return null;
      }
        resolve(stdout.split('\n').join(''));
    });
  });
}

async function short() {
  return _command("git rev-parse --short HEAD");
}
async function long() {
  return _command("git rev-parse HEAD");
}
async function branch() {
  return _command("git rev-parse --abbrev-ref HEAD");
}

function timeout(ms) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(TIMED_OUT), ms);
  });
}

async function isEC2() {
  // the host running the process won't change, so we can cache this value
  if (isEC2._cached !== undefined) {
    return Promise.resolve(isEC2._cached);
  }

  function setCache(value, resolve) {
    isEC2._cached = value;
    resolve(value);
  }

  return new Promise((resolve) => {
    // first try to resolve ec2 internal metadata. This doesn't work with VPC or custom DNS though.
    dns.lookup("instance-data.ec2.internal.", function dnsResult(_err, result) {
      if (result == "169.254.169.254") {
        setCache(true, resolve);
      } else {
        // next do a HEAD query to 'http://169.254.169.254/latest/' with a short timeout
        const req = http.request(BASE_URL, {method: "HEAD"}, () => {
          req.destroy();
          setCache(true, resolve);
        });
        req.setTimeout(500, () => {
          req.destroy();
          setCache(false, resolve);
        });
        req.on("error", () => {
          setCache(false, resolve);
        });
        req.end();
      }
    });
  });
};

async function fetchDataForURL(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, function (res) {
      res.setEncoding("utf8");
      let result = "";
      res.on("data", function (chunk) {
        result += chunk;
      });
      res.on("end", function () {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(result);
        } else if (res.statusCode === 404) {
          // return null for 404 responses - we already know it's a valid request
          // eg. public-ipv4 of a VPC instance without one
          resolve(null);
        } else {
          const e = new Error(result);
          e.code = res.statusCode;
          reject(e);
        }
      });
    });
    req.setTimeout(2500, () => {
      reject(new Error("EC2-Metadata Fetch Timeout."));
      req.destroy();
    });
    req.on("error", (e) => {
      reject(e);
    });
  });
};

async function getMetadataForInstance(type, args) {
  const url = `${BASE_URL}meta-data/${type}`
  return fetchDataForURL(url);
}

async function getEc2(timeoutMs = DEFAULT_EC2_QUERY_TIMEOUT_MS) {
  const localEc2Config = {
    instanceId: "localhost",
    amiId: "localhost"
  };

  const result = await Promise.race([isEC2(), timeout(timeoutMs)]);

  if (result === TIMED_OUT) {
    return localEc2Config;
  }

  const isRunningOnEc2 = result;
  if (!isRunningOnEc2) {
    return localEc2Config;
  }

  try {
    const [instanceId, amiId] = await Promise.all([
      getMetadataForInstance("instance-id"),
      getMetadataForInstance("ami-id")
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
  return Promise.all([short(), long(), branch()])
    .then((results) => {
      return {
        short: results[0],
        long: results[1],
        branch: results[2]
      };
    })
    .catch((err) => {
      console.log("@@@", err);
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

module.exports = {
  getInfo: (timeoutMs) => get(timeoutMs),
  getGitInfo: getGit
};
