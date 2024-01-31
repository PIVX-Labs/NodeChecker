const http = require('http');
const https = require('https');

/**
 * This reachout out over http or https 
 * @param {object} endpoint 
 * @param {*} method 
 * @param {*} body 
 * @param {*} contentType 
 * @param {*} header 
 * @returns 
 */
const request = async (endpoint, method, body, contentType, header = []) => {
    const url = new URL(endpoint);

    //This is the information you need to send to the get the proper response. This is generated from the endpoint object
    const opts = {
        'auth': url.username + ':' + url.password,
        'host': url.host,
        'hostname': url.hostname,
        'port': url.port,
        'href': url.href,
        'protocol': url.protocol,
        'path': url.pathname + url.search,
        'method': method
    };

    const server = opts.protocol === 'https:' ? https : http;

    return new Promise((resolve, reject) => {
        const req = server.request(opts, (res) => {
            let strData = '';
            res.setEncoding('utf8');

            res.on('data', d => strData += d);

            res.on('end', () => {
                // Return the full string
                if(res.statusCode === 200) {
                    resolve(strData);
                }
                else {
                    reject(strData ? strData : res);
                }
            });
        });

        req.on('error', error => reject(error));

        req.setHeader('User-Agent', 'StakeCube');
        req.setHeader('Content-Type', contentType);

        for(const key in header) req.setHeader(key, header[key]);

        if(body) req.write(body);

        req.end();
    });
};

/**
 * Send a get request
 * @param {object} endpoint 
 * @param {*} contentType 
 * @param {*} header 
 * @returns 
 */
const get = async (endpoint, contentType = 'application/json', header = []) => {
    return await request(endpoint, 'GET', null, contentType, header);
};

/**
 * Send a post request
 * @param {object} endpoint 
 * @param {*} contentType 
 * @param {*} header 
 * @returns 
 */
const post = async (endpoint, body, contentType = 'application/json', header = []) => {
    return await request(endpoint, 'POST', body, contentType, header);
};

/**
 * Send a put request
 * @param {object} endpoint 
 * @param {*} contentType 
 * @param {*} header 
 * @returns 
 */
const put = async (endpoint, body, contentType = 'application/json', header = []) => {
    return await request(endpoint, 'PUT', body, contentType, header);
};

exports.get = get;
exports.post = post;
exports.put = put;
