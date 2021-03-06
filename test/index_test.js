const expect = require("chai").expect;
const lib = require("../");
const timeoutMs = 1000;

describe("getInfo", () => {
  it("Should return localhost if not AWS", (done) => {
    lib.getInfo(timeoutMs)
      .then((result) => {
        console.log("instanceId:", result.aws.instanceId);
        console.log("amiId:", result.aws.amiId);
        expect(result.aws.instanceId).to.not.eql(undefined);
        expect(result.aws.amiId).to.not.eql(undefined);
        done();
      })
      .catch((err) => {
        done(err);
      });
  });

  it("should return the git info for the repo", (done) => {
    lib.getInfo(timeoutMs)
      .then((result) => {
        expect(result.git.branch).to.not.be.eql(undefined);
        expect(result.git.short.length).to.be.eql(7);
        expect(result.git.long.length).to.be.eql(40);
        done();
      })
      .catch((err) => {
        done(err);
      });
  });

  it("should return the NODE_ENV if set", (done) => {
    lib.getInfo(timeoutMs)
      .then((result) => {
        expect(result.env.nodeEnv).to.be.eql("test");
        done();
      })
      .catch((err) => {
        done(err);
      });
  });
});


describe("getGitInfo", () => {
  it("should return the git info for the repo", async () => {
    const result = await lib.getGitInfo();

    expect(result.branch).to.not.be.eql(undefined);
    expect(result.short.length).to.be.eql(7);
    expect(result.long.length).to.be.eql(40);
  });
});
