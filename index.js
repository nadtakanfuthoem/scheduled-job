// args
// 0 - GitHub PAT
// 1 - Environment to deploy into
// 2 - Basic auth value
(async () => {
  const args = process.argv.slice(2);
  console.log(args);
  console.log(`Deploying json schemas from master to ${args[1]}`);

  const valueMap = {
    qa: {
      putRequestTypeUrl: 'https://justice-api.tylerapis.com',
      tokenUrl: 'https://tyler-ewarrants.oktapreview.com/oauth2/aus428yfscqgpPeEv1d7/v1/token',
      yNumberUrl: 'https://msgezfgowl.execute-api.us-gov-west-1.amazonaws.com/dev/citations/y-number',
      validateCaseNumberUrl: 'https://msgezfgowl.execute-api.us-gov-west-1.amazonaws.com/dev/validate/${countyName}/${fileNumber}'
    },
    clientTest: {
      putRequestTypeUrl: 'https://test-justice-api.tylerhost.net',
      tokenUrl: 'https://tyler-ewarrants.okta.com/oauth2/ausigr3n2xCy2wwMy357/v1/token',
      yNumberUrl: 'https://test-integration-api.tylerhost.net/nc/citations/y-number',
      validateCaseNumberUrl: 'https://test-integration-api.tylerhost.net/nc/validate/${countyName}/${fileNumber}'
    },
    production: {
      putRequestTypeUrl: 'https://justice-api.tylerhost.net',
      tokenUrl: 'https://tyler-ewarrants.okta.com/oauth2/ausjf1krgm0sIyfJU357/v1/token',
      yNumberUrl: 'https://integration-api.tylerhost.net/nc/citations/y-number',
      validateCaseNumberUrl: 'https://integration-api.tylerhost.net/nc/validate/${countyName}/${fileNumber}'
    }
  }

  const mappings = valueMap[args[1]];
  if (!mappings) {
    console.error(`An invalid value was supplied for environment: ${args[1]}. Valid values are 'qa', 'clientTest', and 'production'.`);
    process.exitCode = 1;
    return;
  }

  function replaceUrls(mappings, requestType) {
    const updatedRequestType = requestType.replace(/{Y_NUMBER_API_URL}/g, mappings.yNumberUrl)
      .replace(/{VALIDATE_CASE_NUMBER_API_URL}/g, mappings.validateCaseNumberUrl);
    return updatedRequestType;
  }

  async function loadFile(fileName, octokit) {
    try {
      const response = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
        owner: 'tyler-technologies',
        repo: 'cj-warrants-json-definitions',
        path: `North Carolina/JSON Schemas/${fileName}`
      });

      const buffer = Buffer.from(response.data.content, 'base64');
      return buffer.toString('utf8');
    }
    catch (err) {
      console.error(err);
    }
  }

  async function getToken(url, token) {
    var data = qs.stringify({
      grant_type: 'client_credentials',
      scope: 'api'
    });

    const response = await axios.post(url, data, {
      headers: {
        'Authorization': `Basic ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    return response.data.access_token;
  }

  async function updateRequestType(baseUrl, token, fields, requestTypeId) {
    try {
      const config = {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Role': 'account-admin'
        }
      };
      await axios.put(`${baseUrl}/request-types/${requestTypeId}/fields`, fields, config);
    } catch (error) {
      if (error.response) {
        console.error(error);
        let errors;
        if (error.response.data.messages && error.response.data.messages.length) {
          errors = error.response.data.messages;
        }

        return {
          errorStatus: error.response.status,
          errors: errors
        };
      }

      throw new Error(error);
    }
  }

  function getRequestTypeId(fileName) {
    const requestTypes = {
      CriminalSummonsCS: '2BcrUpNf6TPBJG6Frz1bE8',
      CriminalSummonsWorthlessCheck: 'uMedyj7nCtRSMs5JyRn2cs',
      FugitiveOrder: '1Suxdt2k2NDcXMq7MC7E9J',
      FugitiveWarrant: '19fAWZ7Wemo3uF5PWi8Kgg',
      MagistrateOrderABCALEMOALE: 'juYubeTMR6cXZXVz37AeZw',
      MagistrateOrderGeneralCitationMOGC: 'jJoQNKJ1LSnn9z59uGtSxZ',
      MagistrateOrderMO: 'wFaPBR9JVKdkX2jYPUKaJK',
      MagistrateOrderWildlifeCitationMOWC: '5HQkTzMkFhtCn6fj9CSPDd',
      OrderForArrest: 'phmTx1BMPFpf9FyJxLiLj7',
      OrderForArrestBulk: 'wPXbT6mmTxTYm2WB3Wy7xs',
      ReleaseOrder: 'pouW4wTfbcVkDSmaTzPjM5',
      WarrantForArrest: '1TvZuXUr3iVeRU1wa7KFiU',
      WarrantForArrestWC: 'eLDYidHEKBoQMkjdmarTzX',
      InvoluntaryCommitmentClinician: 'gcswWK6CjtUTscpaNbPShq',
      InvoluntaryCommitmentnNonClinician: 't6U86vur7QxGqDCg33dWKY'
    }

    return requestTypes[fileName];
  }
})();
