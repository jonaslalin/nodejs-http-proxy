const { createServer, request: httpRequest } = require('http');
const { parse: urlParse } = require('url');
const { Transform } = require('stream');

const { hostname: proxyHostname, port: proxyPort } = urlParse(
  process.env['HTTP_PROXY']
);

const handleError = ({ response, error, statusCode }) => {
  console.error('error', error);
  response.statusCode = statusCode;
  response.end();
};

const defaultModifyProxyRequest = ({ proxyRequest }) => {
  proxyRequest.end();
};

const defaultModifyResponse = ({ response, proxyResponse }) => {
  proxyResponse.pipe(response);
};

const proxyRequest = ({
  request,
  response,
  url,
  modifyProxyRequest = defaultModifyProxyRequest,
  modifyResponse = defaultModifyResponse
}) => {
  const { host, path } = urlParse(url);
  const proxyRequest = httpRequest({
    hostname: proxyHostname,
    port: proxyPort,
    path: path,
    headers: {
      host: host
    }
  })
    .on('error', error => {
      handleError({ response, statuscode: 500, error });
    })
    .on('response', proxyResponse => {
      proxyResponse.on('error', error => {
        handleError({ response, statuscode: 500, error });
      });
      modifyResponse({
        request,
        response,
        proxyRequest,
        proxyResponse
      });
    });
  modifyProxyRequest({ request, proxyRequest });
};

createServer()
  .on('request', (request, response) => {
    request.on('error', error => {
      handleError({ response, statuscode: 400, error });
    });
    response.on('error', error => {
      console.error('error', error);
    });
    if (request.url === '/echo' && request.method === 'POST') {
      request.pipe(response);
    } else if (request.url === '/simple-proxy' && request.method === 'GET') {
      proxyRequest({
        request,
        response,
        url: 'http://example.com'
      });
    } else if (request.url === '/rewrite-proxy' && request.method === 'GET') {
      proxyRequest({
        request,
        response,
        url: 'http://example.com',
        modifyResponse: ({ reponse, proxyResponse }) => {
          proxyResponse
            .pipe(
              new Transform({
                transform(chunk, encoding, callback) {
                  const myLittlePonyLogo =
                    'https://upload.wikimedia.org' +
                    '/wikipedia/en/thumb/b/b9' +
                    '/My_Little_Pony_G4_logo.svg' +
                    '/330px-My_Little_Pony_G4_logo.svg.png';
                  callback(
                    null,
                    chunk
                      .toString()
                      .replace(/Example Domain/g, 'My Little Pony')
                      .replace(
                        /<\/div>/,
                        '    ' + `<img src="${myLittlePonyLogo}">\n` + '</div>'
                      )
                  );
                }
              })
            )
            .on('error', error => {
              handleError({ response, statuscode: 500, error });
            })
            .pipe(response);
        }
      });
    } else {
      response.statusCode = 404;
      response.end();
    }
  })
  .listen(8080);
