const { createServer, request: httpRequest } = require('http');
const { parse: urlParse } = require('url');
const { Transform } = require('stream');

const { hostname: proxyHostname, port: proxyPort } = urlParse(
  process.env['HTTP_PROXY'] || ''
);

function handleError({ response, statusCode, error }) {
  console.error('error', error);
  response.statusCode = statusCode;
  response.end();
}

function defaultModifyProxyRequest({ proxyRequest }) {
  proxyRequest.end();
}

function defaultModifyResponse({ response, proxyResponse }) {
  proxyResponse.pipe(response);
}

function proxyRequest({
  request,
  response,
  url,
  modifyProxyRequest = defaultModifyProxyRequest,
  modifyResponse = defaultModifyResponse
}) {
  const { host, path } = urlParse(url);
  const proxyRequest = httpRequest({
    hostname: proxyHostname || host,
    port: proxyPort || 80,
    path,
    headers: { host }
  })
    .on('error', error => {
      handleError({ response, statusCode: 500, error });
    })
    .on('response', proxyResponse => {
      proxyResponse.on('error', error => {
        handleError({ response, statusCode: 500, error });
      });
      modifyResponse({
        request,
        response,
        proxyRequest,
        proxyResponse
      });
    });
  modifyProxyRequest({ request, proxyRequest });
}

createServer()
  .on('request', (request, response) => {
    request.on('error', error => {
      handleError({ response, statusCode: 400, error });
    });
    response.on('error', error => {
      console.error('error', error);
    });
    // routing
    if (request.url === '/verbose-echo' && request.method === 'POST') {
      verboseEchoController({ request, response });
    } else if (request.url === '/proxy-rewrite' && request.method === 'GET') {
      proxyRewriteController({ request, response });
    } else {
      response.statusCode = 404;
      response.end();
    }
  })
  .listen(8080);

function verboseEchoController({ request, response }) {
  response.write(
    '>>REQUEST_HEADERS\n' +
      `${JSON.stringify(request.headers, null, 2)}\n` +
      '<<REQUEST_HEADERS\n\n'
  );
  response.write('>>REQUEST_BODY\n');
  request.pipe(
    response,
    { end: false }
  );
  request.on('end', () => {
    response.write('<<REQUEST_BODY\n\n');
    proxyRequest({
      request,
      response,
      url: 'http://example.com',
      modifyResponse({ proxyResponse }) {
        response.write(
          '>>PROXY_RESPONSE_HEADERS\n' +
            `${JSON.stringify(proxyResponse.headers, null, 2)}\n` +
            '<<PROXY_RESPONSE_HEADERS\n\n'
        );
        response.write('>>PROXY_RESPONSE_BODY\n');
        proxyResponse.pipe(
          response,
          { end: false }
        );
        proxyResponse.on('end', () => {
          response.write('<<PROXY_RESPONSE_BODY\n');
          response.end();
        });
      }
    });
  });
}

function proxyRewriteController({ request, response }) {
  proxyRequest({
    request,
    response,
    url: 'http://example.com',
    modifyResponse({ proxyResponse }) {
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
          handleError({ response, statusCode: 500, error });
        })
        .pipe(response);
    }
  });
}
