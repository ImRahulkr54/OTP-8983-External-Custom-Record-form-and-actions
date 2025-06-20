/**
 * @NApiVersion 2.1
 * 
 * @NScriptType Suitelet
 * 
 */

/***************************************************************************************  
********* 
 * 
 * OTP-8983 : External Custom Record form and actions
 *
 *  
 ***************************************************************************************
 **********
 *
 * Author : Jobin and Jismi IT Services
 * 
 * Date Created : 19-Jun-2025
 * 
 * Description : This script is defined to Create a custom record with fields Customer
 *               name,Customer email,Subject and Message. Entries to the custom record
 *               can be made externally. If there's a customer with given email address,
 *               link that customer to the record. Whenever there is a entry, notify the
 *               Admin & If there is a Sales rep, Send notification to the Sales rep.
 * 
 * REVISION HISTORY
 * 
 * @version 1.0 19-Jun-2025 : Created the initial build by JJ0400
 * 
 * 
 ****************************************************************************************
***********/

define(["N/email", "N/log", "N/record", "N/search", "N/ui/serverWidget"], 
  /**
 * @param{email} email
 * @param{log} log
 * @param{record} record
 * @param{search} search
 * @param{serverWidget} serverWidget
 */ (email, log, record, search, serverWidget) => {
  /**
   * Defines the Suitelet script trigger point.
   * @param {Object} scriptContext
   * @param {ServerRequest} scriptContext.request - Incoming request
   * @param {ServerResponse} scriptContext.response - Suitelet response
   * @since 2015.2
   */
  const onRequest = (scriptContext) => {

    try {

      if (scriptContext.request.method === "GET") {

        createForm(scriptContext);

      }

      else if (scriptContext.request.method === "POST") {

        let customerName = scriptContext.request.parameters.custpage_name;
        let customerEmail = scriptContext.request.parameters.custpage_email;
        let customerSubject = scriptContext.request.parameters.custpage_subject;
        let customerMessage = scriptContext.request.parameters.custpage_message;

        let customRecId = createCustomRecord(
          customerName,
          customerEmail,
          customerSubject,
          customerMessage
        );

        if (customRecId) {
          salesrepMail(customRecId, customerSubject, customerMessage);
        }

      }

    } catch (error) {
      log.error("error :", error.message);
    }

  };

  function createForm(scriptContext) {

    const form = serverWidget.createForm({
      title: "External Custom Record Form",
    });

    form.addField({
      id: "custpage_name",
      type: serverWidget.FieldType.TEXT,
      label: "Customer Name",
    });

    form.addField({
      id: "custpage_email",
      type: serverWidget.FieldType.EMAIL,
      label: "Customer Email",
    });

    form.addField({
      id: "custpage_subject",
      type: serverWidget.FieldType.TEXT,
      label: "Subject",
    });

    form.addField({
      id: "custpage_message",
      type: serverWidget.FieldType.TEXTAREA,
      label: "Message",
    });

    form.addSubmitButton({
      label: "Submit",
    });

    scriptContext.response.writePage({ pageObject: form });

  }

  function createCustomRecord(customerName, customerEmail, customerSubject, customerMessage) {
    
    let emailSearch = search.create({
      title: "Email Search JJ",
      id: "jj_email_search",
      type: record.Type.CUSTOMER,
      filters: [["email", "is", customerEmail]],
      columns: ["internalid", "email"],
    });

    let resultArr = [];

    let emailSearchRun = emailSearch.run().each(function (result) {
      resultArr.push(result.getValue("internalid"));
    });

    let customerRecord = record.create({
      type: "customrecord_jj_external_custom_record",
      isDynamic: "true",
    });

    customerRecord.setValue({
      fieldId: "custrecord_jj_customer_name",
      value: customerName || " ",
    });

    customerRecord.setValue({
      fieldId: "custrecord_jj_customer_email",
      value: customerEmail || " ",
    });

    customerRecord.setValue({
      fieldId: "custrecord_jj_reference_customer",
      value: resultArr[0] || " ",
    });

    customerRecord.setValue({
      fieldId: "custrecord_jj_subject",
      value: customerSubject || " ",
    });

    customerRecord.setValue({
      fieldId: "custrecord_jj_message",
      value: customerMessage || " ",
    });

    let customRecId = customerRecord.save();

    let adminName = "Larry Nelson";
    let adminEmail = "ss2extend040425aj@oracle.com";

    email.send({
      author: -5,
      recipients: adminEmail,
      subject: `New Record Entered : ${customerSubject}`,
      body: `\nDear ${adminName},\n\nA new entry has been created.\n
                Subject: ${customerSubject}\n
                Message: ${customerMessage}\n\n
                Best regards,\n${adminName}`,
    });

    return resultArr.length > 0 ? customRecId : null;

  }

  function salesrepMail(paramsId, paramsSubject, paramsMessage) {

    let fieldLookUp = search.lookupFields({
      type: "customrecord_jj_external_custom_record",
      id: paramsId,
      columns: ["custrecord_jj_reference_customer"],
    });

    if (fieldLookUp.custrecord_jj_reference_customer[0].value) {

      let salesRepLookUp = search.lookupFields({
        type: record.Type.CUSTOMER,
        id: fieldLookUp.custrecord_jj_reference_customer[0].value,
        columns: ["salesrep"],
      });

      if (salesRepLookUp.salesrep[0].value) {

        let emailLookUp = search.lookupFields({
          type: record.Type.EMPLOYEE,
          id: salesRepLookUp.salesrep[0].value,
          columns: ["entityid", "email"],
        });

        let adminName = "Larry Nelson";

        if (emailLookUp.email) {
          
          email.send({
            author: -5,
            recipients: emailLookUp.email,
            subject: `New Record Entered : ${paramsSubject}`,
            body: `\nDear ${emailLookUp.entityid},\n\nA new entry has been created.\n
                      Subject: ${paramsSubject}\n
                      Message: ${paramsMessage}\n\n
                       Best regards,\n${adminName}`,
          });
        }
      }
    }
  }

  return { onRequest };
});
