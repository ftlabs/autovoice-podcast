const debug = require('debug')('bin:lib:mailer');
const fetch = require('node-fetch');
const assert = require('assert');

// email api via https://email-webservices.ft.com/docs/email-simple/#api-Send-Post_send_by_address

[
	'MAIL_RECIPIENTS',
	'MAIL_FROM_SUBDOMAIN',
	'MAIL_FROM_PREFIX',
	'MAIL_FROM_NAME',
	'MAIL_POST_URL',
	'MAIL_POST_AUTH_TOKEN'
].forEach(function(p){
	assert(process.env[p], `missing env param: ${p}`);
});

const recipients           = process.env.MAIL_RECIPIENTS.split(',');
const from_email_subdomain = process.env.MAIL_FROM_SUBDOMAIN;
const from_email_prefix    = process.env.MAIL_FROM_PREFIX;
const from_email_name      = process.env.MAIL_FROM_NAME;
const mail_post_url        = process.env.MAIL_POST_URL;
const mail_post_auth_token = process.env.MAIL_POST_AUTH_TOKEN;

const from_email_address   = `${from_email_prefix}@${from_email_subdomain}`;
const defaultSubject       = 'Audio file retrieved from 3rd partys';

function sendMessage(data){
	const subject = `Audio file retrieved from 3rd partys: ${data.title}, ${data.itemUUID}`;
	const plainTextContent = `
This email is being sent to ${recipients.join(", ")}.

The Business Development team (Kayode Josiah) is running an experiment with 3rd partys providing human-voiced audio files of FT articles (chosen by FirstFT, Andrew Jack). 

A new audio file has been retrieved from the 3rd party (${data.provider}).
for article ${data.itemUUID},
title: ${data.title}.

You can find the FT copy at 
${data.ftCopyUrl}

and the 3rd party copy is at 
${data.partnerCopyUrl}.

The Ingestion admin page is
${data.ingestorAdminUrl}
`;

	let htmlContent = `
<p>
This email is being sent to ${recipients.join(", ")}.
</p>
<p>
The Business Development team (Kayode Josiah) is running an experiment with 3rd partys providing human-voiced audio files of FT articles (chosen by FirstFT, Andrew Jack). 
</p>
<p>
A new audio file has been retrieved from the 3rd party (${data.provider}).
</p>
<p>
for article ${data.itemUUID},
<br>
title: ${data.title}.
</p>
<p>
You can find the FT copy at 
<br>
<a href="${data.ftCopyUrl}">${data.ftCopyUrl}</a>.
</p>
<p>
and the 3rd party's copy at 
<br>
<a href="${data.partnerCopyUrl}">${data.partnerCopyUrl}</a>.
</p>
`;

	const post_body_data = {
		transmissionHeader: {
			description: "alerting that 3rd partys have generated a human-voiced audio file for another article",
		    metadata: {
		        audioArticleIngestionUuid: data.itemUUID
		    },
		},
		to: {
		    address: recipients
		},
		from: {
		    address: from_email_address,
		    name:    from_email_name
		},
		subject:          subject,
		htmlContent:      htmlContent,
		plainTextContent: plainTextContent
	};

	fetch(mail_post_url, {
		method       : 'POST', 
		body         :  JSON.stringify(post_body_data),
		headers      : {
  			'Content-Type'  : 'application/json',
  			'Authorization' : mail_post_auth_token
  		}
	})
		.then(res => {

			if(res.status !== 200){
				throw [
					`An error occurred sending email for data=${JSON.stringify(data)},\nres=${JSON.stringify(res)}`, 
					res
					];
			} else {
				debug(`Email sent, for data=${JSON.stringify(data)}`);
			}
		})
		.catch(errDetails => {
			debug(errDetails[0]);
			errDetails[1].json()
				.then(json => {
					debug(`res.json()=${json}`);
				})
			;
		})
	;
}

module.exports = {
	send : sendMessage
};