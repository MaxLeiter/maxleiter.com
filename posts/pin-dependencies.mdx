---
title: Pin your npm/yarn dependencies
description: A guide on how to pin your dependencies and why you may want to
slug: pin-dependencies
date: Jan 9, 2022
# published: false
---

Today, the open-source maintainer [Marak](https://github.com/Marak) intentionally [bricked two popular JavaScript libraries](https://www.bleepingcomputer.com/news/security/dev-corrupts-npm-libs-colors-and-faker-breaking-thousands-of-apps/) (with ~25 total million weekly downloads) in such a way that they broke dependents software. There's nothing that npm or any other public registry could've done to have prevented this; the release was indistinguishable from a regular update, unless you looked at the code. This is not the first time an npm dependency has [gone rogue](https://qz.com/646467/how-one-programmer-broke-the-internet-by-deleting-a-tiny-piece-of-code/) and [caused havoc](https://github.com/dominictarr/event-stream/issues/115) due to supply chain problems, and it certainly won't be the last. And so the defensive role falls to you, the developer.

### Pinning dependencies

My recommendation is to **pin your dependencies**. If you're unfamiliar with what this means, you should first be familiar with [semantic versioning](https://semver.org/). In short, pinning dependencies means the _exact_ version specified will be installed, rather than a dependency matching the range criteria. Here's an example:

```json
{
  "dependencies": {
    "react": "17.0.2", // installs react@17.0.2 exactly. I recommend this.
    "react": "^17.0.2", // installs the latest minor version after .0 (so 17.*.*)
    "react": "~17.0.2" // installs the latest patch after .2 (so 17.0.*)
  }
}
```

To automatically accomplish this in your projects, you can add `save-exact=true` to a `.npmrc` file, or use `--save-exact` when adding the dependency via npm (or `--exact` via yarn).

If you do this, I also recommend some sort of dependency management so you stay up-to-date. I personally use the [renovate](https://github.com/renovatebot/renovate) bot for my GitHub projects.

### What about lockfiles?

You may have noticed npm and yarn generate `package-lock.json` and `yarn.lock` when you run `npm i` and `yarn`, respectively. The lockfiles allow every version of every sub-dependency to be pinned, while modifying the package.json only guarantees we pin the immediate dependency (which may not pin its own dependencies).

One problem with relying on lockfiles is that they and their semantics are confusing. In my experience, many new-to-npm users expect `npm i` to function like `npm ci`, and are unaware of the differences. `npm i` can update `package-lock.json`, whereas `npm ci` will only read from it.

> Tip: You almost always want to use `npm ci`

Meanwhile, with yarn, `yarn install` will install the version in the yarn.lock, regardless of the version in the package.json. Good for security? Sure. Good for the developer experience? Not so much. You need to use `yarn upgrade <package>` in order to fetch the version in the package.json if it's more recent than specified in the yarn.lock. It's now far more difficult to determine _when_ something is updated. If you've ever found yourself staring at a yarn.lock diff you'll know what I mean.

Lockfiles are good tools, but can be difficult and unintuitive to work with.

### In conclusion

Use lockfiles for pinning transitive dependencies, but have your package.json be the source of truth. Pin your dependencies so you have a human-friendly, readable method to audit your dependencies and ensure a specific version is installed. Automate some process to make sure you remain up-to-date.

If you disagree or have comments, feel free to [email me](mailto:maxwell.leiter@gmail.com) or reach out on [Twitter](https://twitter.com/max_leiter).
