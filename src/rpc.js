'use strict';

const NET = require('./net.js');

/**
 * This creates the JSON to send to the network when requesting data from the wallet
 */
class RPC {
    constructor(user, pass, host, port) {
        this.user = user;
        this.pass = pass;
        this.host = host;
        this.port = port;
        this._id = 0;
    }

    async call() {
        try {
            const method = arguments[0];
            const params = [...arguments].splice(1);
            const request = {
                'jsonrpc': '1.0',
                'id': this._id,
                'method': method,
                'params': params
            };

            let res = JSON.parse(await NET.post('http://' +
                                this.user + ':' +
                                this.pass + '@' +
                                this.host + ':' +
                                this.port,
            JSON.stringify(request)));
            // Result may be JSON or a string, so we'll attempt to parse JSON, but if it fails then it's fine too! It's a string
            try {
                res = JSON.parse(res.result);
            }
            catch(e) {
                res = res.result;
            }
            this._id++;
            return res;
        }
        catch(e) {
            throw e.json ? (await e.json()).error : e;
        }
    }
}

module.exports = RPC;
