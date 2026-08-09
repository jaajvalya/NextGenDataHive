if (window.lucide && typeof lucide.createIcons === "function") {
  lucide.createIcons({ attrs: { "stroke-width": "1.75", "aria-hidden": "true" } });
}

const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => [...root.querySelectorAll(sel)];

const CLOUDS = {
  gcp: {
    id: "gcp",
    type: "googlecloud",
    name: "Google Cloud Platform",
    short: "GCP",
    logo: "images/logos/googlecloud-color.svg",
    lead: "Provide project credentials and the APIs you want DataHive to use when fetching assets from Google Cloud.",
    accountLabel: "Project ID",
    accountPlaceholder: "my-gcp-project",
    namePlaceholder: "Prod GCP — Analytics",
    scopeLabel: "Dataset / bucket scope",
    scopePlaceholder: "analytics.*, raw_events (optional filter)",
    scopeHelp: "Optional allow-list of datasets, buckets, or resource patterns.",
    regions: ["us-central1","us-east1","us-west1","europe-west1","asia-south1","asia-southeast1"],
    auth: [
      { value:"service_account", label:"Service account (JSON key)" },
      { value:"api_key", label:"API key" },
      { value:"oauth2", label:"OAuth 2.0 (Client ID + Secret)" }
    ],
    apis: [
      { value:"bigquery", label:"BigQuery", checked:true },
      { value:"cloud_storage", label:"Cloud Storage", checked:true },
      { value:"pubsub", label:"Pub/Sub" },
      { value:"dataflow", label:"Dataflow" },
      { value:"dataproc", label:"Dataproc" }
    ],
    saLabel: "Service account JSON",
    saHelp: "Paste the JSON key from IAM → Service Accounts. Never commit this file.",
    saPlaceholder: '{"type":"service_account","project_id":"...","private_key":"..."}'
  },
  aws: {
    id: "aws",
    type: "amazonwebservices",
    name: "Amazon Web Services",
    short: "AWS",
    logo: "images/logos/amazonwebservices.svg",
    lead: "Provide account credentials and the AWS services you want DataHive to use when fetching assets.",
    accountLabel: "AWS account ID",
    accountPlaceholder: "123456789012",
    namePlaceholder: "Prod AWS — Analytics",
    scopeLabel: "Bucket / resource scope",
    scopePlaceholder: "s3://analytics-*, glue:db_* (optional filter)",
    scopeHelp: "Optional allow-list of buckets, databases, or resource patterns.",
    regions: ["us-east-1","us-west-2","eu-west-1","eu-central-1","ap-south-1","ap-southeast-1"],
    auth: [
      { value:"access_keys", label:"Access key + secret" },
      { value:"iam_role", label:"IAM role ARN" },
      { value:"assume_role", label:"Assume role (STS)" }
    ],
    apis: [
      { value:"s3", label:"S3", checked:true },
      { value:"glue", label:"Glue", checked:true },
      { value:"athena", label:"Athena" },
      { value:"redshift", label:"Redshift" },
      { value:"kinesis", label:"Kinesis" }
    ],
    saLabel: "",
    saHelp: "",
    saPlaceholder: ""
  },
  azure: {
    id: "azure",
    type: "microsoftazure",
    name: "Microsoft Azure",
    short: "Azure",
    logo: "images/logos/microsoftazure.svg",
    lead: "Provide subscription credentials and the Azure services you want DataHive to use when fetching assets.",
    accountLabel: "Subscription ID",
    accountPlaceholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    namePlaceholder: "Prod Azure — Analytics",
    scopeLabel: "Storage / resource scope",
    scopePlaceholder: "storageacct*, rg-analytics (optional filter)",
    scopeHelp: "Optional allow-list of storage accounts, containers, or resource patterns.",
    regions: ["eastus","westus2","westeurope","northeurope","centralindia","southeastasia"],
    auth: [
      { value:"service_principal", label:"Service principal (Client ID + Secret)" },
      { value:"managed_identity", label:"Managed identity" },
      { value:"client_certificate", label:"Client certificate (JSON)" }
    ],
    apis: [
      { value:"blob_storage", label:"Blob Storage", checked:true },
      { value:"adls", label:"ADLS Gen2", checked:true },
      { value:"synapse", label:"Synapse" },
      { value:"event_hubs", label:"Event Hubs" },
      { value:"data_factory", label:"Data Factory" }
    ],
    saLabel: "Client certificate / JSON",
    saHelp: "Paste the certificate or credential JSON for the app registration.",
    saPlaceholder: '{"clientId":"...","tenantId":"...","certificate":"..."}'
  },
  snowflake: {
    id: "snowflake",
    type: "snowflake",
    name: "Snowflake",
    short: "Snowflake",
    logo: "images/logos/snowflake.svg",
    lead: "Provide account credentials and the Snowflake objects you want DataHive to use when fetching assets.",
    accountLabel: "Account identifier",
    accountPlaceholder: "xy12345.us-east-1 or orgname-account",
    namePlaceholder: "Prod Snowflake — Analytics",
    scopeLabel: "Database / schema scope",
    scopePlaceholder: "ANALYTICS.*, RAW.PUBLIC (optional filter)",
    scopeHelp: "Optional allow-list of databases, schemas, or object patterns.",
    regions: [
      "us-east-1", "us-west-2", "eu-west-1", "eu-central-1",
      "ap-southeast-1", "ap-southeast-2", "ap-south-1", "east-us-2.azure", "west-europe.azure"
    ],
    auth: [
      { value: "key_pair", label: "Key-pair (private key)" },
      { value: "password", label: "Username + password" },
      { value: "oauth2", label: "OAuth 2.0 (Client ID + Secret)" }
    ],
    apis: [
      { value: "databases", label: "Databases & schemas", checked: true },
      { value: "tables", label: "Tables & views", checked: true },
      { value: "warehouses", label: "Warehouses", checked: true },
      { value: "stages", label: "Stages" },
      { value: "shares", label: "Shares" }
    ],
    saLabel: "Private key (PEM)",
    saHelp: "Paste the RSA private key used for Snowflake key-pair authentication. Prefer key-pair over passwords.",
    saPlaceholder: "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----",
    hint: "Configure Snowflake connectivity",
    accessKeyLabel: "Username",
    secretKeyLabel: "Password"
  },
  databricks: {
    id: "databricks",
    type: "databricks",
    name: "Databricks",
    short: "Databricks",
    logo: "images/logos/databricks.svg",
    lead: "Provide workspace credentials and the Databricks services you want DataHive to use when fetching assets.",
    accountLabel: "Workspace URL",
    accountPlaceholder: "https://dbc-xxxxxxxx-xxxx.cloud.databricks.com",
    namePlaceholder: "Prod Databricks — Lakehouse",
    scopeLabel: "Catalog / schema scope",
    scopePlaceholder: "main.*, analytics.silver (optional filter)",
    scopeHelp: "Optional allow-list of Unity Catalog catalogs, schemas, or warehouse IDs.",
    regions: [
      "us-east-1", "us-west-2", "us-east-2", "eu-west-1", "eu-central-1",
      "ap-southeast-1", "ap-southeast-2", "ap-south-1", "eastus", "westeurope"
    ],
    auth: [
      { value: "api_key", label: "Personal access token (PAT)" },
      { value: "service_principal", label: "Service principal (Client ID + Secret)" },
      { value: "oauth2", label: "OAuth 2.0 (Client ID + Secret)" }
    ],
    apis: [
      { value: "unity_catalog", label: "Unity Catalog", checked: true },
      { value: "sql_warehouses", label: "SQL warehouses", checked: true },
      { value: "clusters", label: "Clusters", checked: true },
      { value: "jobs", label: "Jobs" },
      { value: "dbfs", label: "DBFS / Volumes" }
    ],
    saLabel: "",
    saHelp: "",
    saPlaceholder: "",
    hint: "Configure Databricks connectivity",
    apiKeyLabel: "Personal access token"
  },
  postgresql: {
    id: "postgresql",
    type: "postgresql",
    mode: "database",
    engine: "postgresql",
    name: "PostgreSQL",
    short: "PostgreSQL",
    logo: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/postgresql/postgresql-original.svg",
    lead: "Connect a PostgreSQL database (on-premises or self-hosted) using host, port, database name, and credentials.",
    accountLabel: "Host / IP",
    accountPlaceholder: "db.corp.local or 10.0.1.25",
    namePlaceholder: "Prod PostgreSQL — Analytics",
    scopeLabel: "Schema scope",
    scopePlaceholder: "public, sales (optional filter)",
    scopeHelp: "Optional allow-list of schemas or object patterns to catalog.",
    regions: ["on-prem"],
    auth: [
      { value: "password", label: "Username + password" }
    ],
    apis: [
      { value: "tables", label: "Tables & views", checked: true },
      { value: "schemas", label: "Schemas", checked: true }
    ],
    saLabel: "",
    saHelp: "",
    saPlaceholder: "",
    hint: "Configure PostgreSQL connectivity",
    accessKeyLabel: "Username",
    secretKeyLabel: "Password",
    defaultPort: "5432"
  },
  sqlserver: {
    id: "sqlserver",
    type: "sqlserver",
    mode: "database",
    engine: "sqlserver",
    name: "SQL Server",
    short: "SQL Server",
    logo: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/microsoftsqlserver/microsoftsqlserver-original.svg",
    lead: "Connect a Microsoft SQL Server database (on-premises or self-hosted) using host, port, database name, and credentials.",
    accountLabel: "Host / IP",
    accountPlaceholder: "sql.corp.local or 10.0.1.40",
    namePlaceholder: "Prod SQL Server — Analytics",
    scopeLabel: "Schema scope",
    scopePlaceholder: "dbo, sales (optional filter)",
    scopeHelp: "Optional allow-list of schemas or object patterns to catalog.",
    regions: ["on-prem"],
    auth: [
      { value: "password", label: "Username + password" }
    ],
    apis: [
      { value: "tables", label: "Tables & views", checked: true },
      { value: "schemas", label: "Schemas", checked: true }
    ],
    saLabel: "",
    saHelp: "",
    saPlaceholder: "",
    hint: "Configure SQL Server connectivity",
    accessKeyLabel: "Username",
    secretKeyLabel: "Password",
    defaultPort: "1433"
  },
  mongodb: {
    id: "mongodb",
    type: "mongodb",
    mode: "database",
    engine: "mongodb",
    name: "MongoDB",
    short: "MongoDB",
    logo: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/mongodb/mongodb-original.svg",
    lead: "Connect a MongoDB database (on-premises, Atlas, or self-hosted) using host, port, database name, and credentials.",
    accountLabel: "Host / IP",
    accountPlaceholder: "mongo.corp.local or cluster0.xxxxx.mongodb.net",
    namePlaceholder: "Prod MongoDB — Analytics",
    scopeLabel: "Collection scope",
    scopePlaceholder: "customers, orders (optional filter)",
    scopeHelp: "Optional allow-list of collections or name patterns to catalog.",
    regions: ["on-prem"],
    auth: [
      { value: "password", label: "Username + password" }
    ],
    apis: [
      { value: "collections", label: "Collections", checked: true },
      { value: "databases", label: "Databases", checked: true }
    ],
    saLabel: "",
    saHelp: "",
    saPlaceholder: "",
    hint: "Configure MongoDB connectivity",
    accessKeyLabel: "Username",
    secretKeyLabel: "Password",
    defaultPort: "27017"
  },
  upload: {
    id: "upload",
    type: "manualupload",
    mode: "upload",
    name: "File Upload",
    short: "Upload",
    logo: "images/upload.png",
    lead: "Upload a local data file (CSV, Excel, JSON, or Parquet) for DataHive to ingest and catalog.",
    accountLabel: "File",
    accountPlaceholder: "",
    namePlaceholder: "Sales extract — Q2",
    scopeLabel: "",
    scopePlaceholder: "",
    scopeHelp: "",
    regions: [],
    auth: [],
    apis: [],
    saLabel: "",
    saHelp: "",
    saPlaceholder: "",
    hint: "Upload a data file"
  },
  sharepoint: {
    id: "sharepoint",
    type: "microsoftsharepoint",
    name: "SharePoint",
    short: "SharePoint",
    logo: "images/logos/microsoftsharepoint.svg",
    lead: "Connect a SharePoint site so DataHive can fetch document libraries, lists, and files.",
    accountLabel: "Site URL",
    accountPlaceholder: "https://contoso.sharepoint.com/sites/Analytics",
    namePlaceholder: "Prod SharePoint — Analytics",
    scopeLabel: "Library / folder scope",
    scopePlaceholder: "Documents/*, Shared Documents/Reports (optional)",
    scopeHelp: "Optional allow-list of libraries, lists, or folder paths.",
    regions: ["global","nam","eur","apac"],
    needsTenant: true,
    auth: [
      { value:"oauth2", label:"OAuth 2.0 (delegated)" },
      { value:"service_principal", label:"App registration (Client ID + Secret)" }
    ],
    apis: [
      { value:"document_libraries", label:"Document libraries", checked:true },
      { value:"lists", label:"Lists", checked:true },
      { value:"pages", label:"Site pages" },
      { value:"subsites", label:"Subsites" }
    ],
    saLabel: "",
    saHelp: "",
    saPlaceholder: "",
    hint: "Configure site connectivity"
  },
  googledrive: {
    id: "googledrive",
    type: "googledrive",
    name: "Google Drive",
    short: "Google Drive",
    logo: "images/logos/googledrive.svg",
    lead: "Connect Google Drive so DataHive can fetch files and shared drives from your Google Workspace.",
    accountLabel: "Google account / domain",
    accountPlaceholder: "analytics@company.com or company.com",
    namePlaceholder: "Prod Google Drive — Shared",
    scopeLabel: "Folder / drive scope",
    scopePlaceholder: "My Drive/Reports, Shared drives/Finance (optional)",
    scopeHelp: "Optional allow-list of folders or shared drive names.",
    regions: ["global"],
    auth: [
      { value:"oauth2", label:"OAuth 2.0 (Client ID + Secret)" },
      { value:"service_account", label:"Service account (JSON key)" }
    ],
    apis: [
      { value:"my_drive", label:"My Drive", checked:true },
      { value:"shared_drives", label:"Shared drives", checked:true },
      { value:"shared_with_me", label:"Shared with me" }
    ],
    saLabel: "Service account JSON",
    saHelp: "Paste the JSON key with Drive API access. Domain-wide delegation may be required.",
    saPlaceholder: '{"type":"service_account","project_id":"...","private_key":"..."}',
    hint: "Configure Drive connectivity"
  },
  onedrive: {
    id: "onedrive",
    type: "microsoftonedrive",
    name: "OneDrive",
    short: "OneDrive",
    logo: "images/logos/microsoftonedrive.svg",
    lead: "Connect OneDrive for Business so DataHive can fetch user and shared files via Microsoft Graph.",
    accountLabel: "User / drive path",
    accountPlaceholder: "user@contoso.com or /drives/{drive-id}",
    namePlaceholder: "Prod OneDrive — Finance",
    scopeLabel: "Folder scope",
    scopePlaceholder: "Documents/Reports, Shared (optional)",
    scopeHelp: "Optional allow-list of folders or path patterns.",
    regions: ["global","nam","eur","apac"],
    needsTenant: true,
    auth: [
      { value:"oauth2", label:"OAuth 2.0 (delegated)" },
      { value:"service_principal", label:"App registration (Client ID + Secret)" }
    ],
    apis: [
      { value:"files", label:"Files", checked:true },
      { value:"shared", label:"Shared", checked:true },
      { value:"recent", label:"Recent" }
    ],
    saLabel: "",
    saHelp: "",
    saPlaceholder: "",
    hint: "Configure OneDrive connectivity"
  }
};

const grid = $("#cloudGrid");
const modalOverlay = $("#connModalOverlay");
const panel = $("#connPanel");
const form = $("#connForm");
const errBox = $("#formError");
const statusEl = $("#connStatus");
let activeCloud = null;
let selectedUploadFile = null;

Object.values(CLOUDS).forEach(cloud => {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "cloud-btn";
  btn.dataset.cloud = cloud.id;
  btn.setAttribute("aria-expanded", "false");
  btn.setAttribute("aria-controls", "connModalOverlay");
  btn.innerHTML =
    `<div class="cic"><img src="${cloud.logo}" alt="${cloud.name}" width="32" height="32" /></div>` +
    `<span class="label">${cloud.name}</span>` +
    `<span class="hint">${cloud.hint || "Configure API connectivity"}</span>`;
  btn.addEventListener("click", () => {
    if (activeCloud === cloud.id && !modalOverlay.classList.contains("hidden")) closePanel();
    else openPanel(cloud.id);
  });
  grid.appendChild(btn);
});

function formatBytes(n){
  if (!n && n !== 0) return "";
  if (n < 1024) return n + " B";
  if (n < 1048576) return (n / 1024).toFixed(1) + " KB";
  return (n / 1048576).toFixed(1) + " MB";
}

function clearUploadSelection(){
  selectedUploadFile = null;
  $("#uploadFileInput").value = "";
  $("#uploadSelected").classList.add("hidden");
  $("#uploadDropzone").classList.remove("hidden");
}

function selectUploadFile(file){
  if (!file) return;
  if (!/\.(csv|tsv|txt|xlsx|xls|json|parquet)$/i.test(file.name)) {
    return showError("Please choose a CSV, Excel, JSON, or Parquet file.");
  }
  if (file.size > 50 * 1024 * 1024) {
    return showError("File is too large. Maximum size is 50 MB.");
  }
  errBox.classList.add("hidden");
  selectedUploadFile = file;
  $("#uploadSelectedName").textContent = file.name;
  $("#uploadSelectedSize").textContent = formatBytes(file.size);
  $("#uploadSelected").classList.remove("hidden");
  $("#uploadDropzone").classList.add("hidden");

  const ext = file.name.split(".").pop().toLowerCase();
  const formatSel = $("#cf_upload_format");
  if (ext === "csv" || ext === "tsv" || ext === "txt") formatSel.value = "csv";
  else if (ext === "xlsx" || ext === "xls") formatSel.value = "excel";
  else if (ext === "json") formatSel.value = "json";
  else if (ext === "parquet") formatSel.value = "parquet";
  else formatSel.value = "auto";
}

const dropzone = $("#uploadDropzone");
const fileInput = $("#uploadFileInput");
dropzone.addEventListener("click", () => fileInput.click());
dropzone.addEventListener("keydown", (e)=>{
  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInput.click(); }
});
fileInput.addEventListener("change", (e)=> selectUploadFile(e.target.files[0]));
["dragenter","dragover"].forEach(ev => dropzone.addEventListener(ev, (e)=>{
  e.preventDefault(); dropzone.classList.add("dragover");
}));
["dragleave","drop"].forEach(ev => dropzone.addEventListener(ev, (e)=>{
  e.preventDefault(); dropzone.classList.remove("dragover");
}));
dropzone.addEventListener("drop", (e)=> selectUploadFile(e.dataTransfer.files[0]));
$("#uploadClearBtn").addEventListener("click", clearUploadSelection);

function fillSelect(sel, options, selected){
  sel.innerHTML = options.map(o => {
    const value = typeof o === "string" ? o : o.value;
    const label = typeof o === "string" ? o : o.label;
    return `<option value="${value}"${value===selected?" selected":""}>${label}</option>`;
  }).join("");
}

function isDatabaseCloud(cloud) {
  return !!(
    cloud &&
    (cloud.mode === "database" ||
      cloud.id === "postgresql" ||
      cloud.id === "sqlserver" ||
      cloud.id === "mongodb" ||
      cloud.id === "rdbms")
  );
}

function dbCloudEngine(cloud) {
  if (!cloud) return "postgresql";
  if (cloud.engine) return cloud.engine;
  if (cloud.id === "sqlserver") return "sqlserver";
  if (cloud.id === "mongodb") return "mongodb";
  if (cloud.id === "postgresql" || cloud.id === "postgres") return "postgresql";
  return "postgresql";
}

function dbDefaultPort(cloud) {
  if (cloud && cloud.defaultPort) return String(cloud.defaultPort);
  const engine = dbCloudEngine(cloud);
  if (engine === "sqlserver") return "1433";
  if (engine === "mongodb") return "27017";
  return "5432";
}

function configureForm(cloud){
  const isUpload = cloud.mode === "upload";
  const isDb = isDatabaseCloud(cloud);
  $("#panelLogo").src = cloud.logo;
  $("#panelTitle").textContent = isUpload
    ? "File upload"
    : isDb
      ? cloud.short + " connectivity"
      : (cloud.short + " API connectivity");
  $("#panelLead").textContent = cloud.lead;
  $("#cf_display_name").placeholder = cloud.namePlaceholder;
  $("#submitBtn").textContent = isUpload ? "Upload & ingest" : "Connect & fetch";

  $("#cloudFields").classList.toggle("hidden", isUpload);
  $("#uploadFields").classList.toggle("hidden", !isUpload);
  clearUploadSelection();

  if (isUpload) return;

  $("#cf_account_label").innerHTML = cloud.accountLabel + ' <span class="req">*</span>';
  $("#cf_account_id").placeholder = cloud.accountPlaceholder;
  $("#cf_scope_label").textContent = cloud.scopeLabel;
  $("#cf_scope").placeholder = cloud.scopePlaceholder;
  $("#cf_scope_help").textContent = cloud.scopeHelp;
  $("#cf_apis_label").textContent = isDb
    ? "Objects to catalog"
    : "APIs / services to fetch from";

  fillSelect($("#cf_region"), cloud.regions, cloud.regions[0]);
  fillSelect($("#cf_auth_type"), cloud.auth, cloud.auth[0].value);

  $("#cf_apis").innerHTML = cloud.apis.map(a =>
    `<label class="check"><input type="checkbox" name="apis" value="${a.value}"${a.checked?" checked":""} /> ${a.label}</label>`
  ).join("");

  const needsTenant = !!cloud.needsTenant || cloud.id === "azure";
  $("#group_azure_extra").classList.toggle("hidden", !needsTenant);
  $("#group_resource_group").classList.toggle("hidden", cloud.id !== "azure");
  if ($("#group_db_host")) $("#group_db_host").classList.toggle("hidden", !isDb);
  // Region is not meaningful for host/port database connections.
  const regionField = $("#cf_region") ? $("#cf_region").closest(".field") : null;
  if (regionField) regionField.classList.toggle("hidden", isDb);
  if ($("#group_apis")) $("#group_apis").classList.toggle("hidden", false);

  if (isDb) {
    if ($("#cf_db_port")) $("#cf_db_port").value = dbDefaultPort(cloud);
    if ($("#cf_db_database")) $("#cf_db_database").value = "";
    const help = $("#cf_db_host_help");
    if (help) {
      if (cloud.id === "sqlserver") {
        help.textContent = "Use the SQL Server host or instance. Default port is 1433.";
      } else if (cloud.id === "mongodb") {
        help.textContent =
          "Use the MongoDB host or Atlas hostname. Default port is 27017. Database is the auth/catalog DB name.";
      } else {
        help.textContent = "Use the PostgreSQL host. Default port is 5432.";
      }
    }
  }

  $("#cf_sa_label").innerHTML = (cloud.saLabel || "Credential JSON") + ' <span class="req">*</span>';
  $("#cf_sa_help").textContent = cloud.saHelp || "";
  $("#cf_sa_json").placeholder = cloud.saPlaceholder || "";

  const microsoftApp = cloud.id === "azure" || cloud.id === "sharepoint" || cloud.id === "onedrive";
  if (microsoftApp) {
    $("#cf_client_id_label").innerHTML = 'Application (client) ID <span class="req">*</span>';
    $("#cf_client_secret_label").innerHTML = 'Client secret <span class="req">*</span>';
  } else {
    $("#cf_client_id_label").innerHTML = 'OAuth Client ID <span class="req">*</span>';
    $("#cf_client_secret_label").innerHTML = 'Client secret <span class="req">*</span>';
  }
  $("#cf_api_key_label").innerHTML =
    (cloud.apiKeyLabel || "API key") + ' <span class="req">*</span>';

  const accessKeyLabel = cloud.accessKeyLabel || "Access key ID";
  const secretKeyLabel = cloud.secretKeyLabel || "Secret access key";
  const accessKeyLbl = document.querySelector('label[for="cf_access_key_id"]');
  const secretKeyLbl = document.querySelector('label[for="cf_secret_access_key"]');
  if (accessKeyLbl) accessKeyLbl.innerHTML = accessKeyLabel + ' <span class="req">*</span>';
  if (secretKeyLbl) secretKeyLbl.innerHTML = secretKeyLabel + ' <span class="req">*</span>';

  toggleAuth(cloud.auth[0].value, cloud);
}

function toggleAuth(type, cloud = CLOUDS[activeCloud]){
  if (!cloud) return;
  const showSa = type === "service_account" || type === "client_certificate" || type === "key_pair";
  const showApiKey = type === "api_key";
  const showOauth = type === "oauth2" || type === "service_principal";
  const showAccessKeys = type === "access_keys" || type === "password" || type === "key_pair";
  const showRole = type === "iam_role" || type === "assume_role";
  const googleOauth = showOauth && (cloud.id === "gcp" || cloud.id === "googledrive");
  const refreshRequired = showOauth && cloud.id === "googledrive";

  $("#group_sa").classList.toggle("hidden", !showSa);
  $("#group_api_key").classList.toggle("hidden", !showApiKey);
  $("#group_oauth").classList.toggle("hidden", !showOauth);
  $("#group_access_keys").classList.toggle("hidden", !showAccessKeys);
  $("#group_role_arn").classList.toggle("hidden", !showRole);
  $("#group_refresh_token").classList.toggle("hidden", !googleOauth);
  if (googleOauth) {
    const req = refreshRequired ? ' <span class="req">*</span>' : "";
    $("#cf_refresh_token_label").innerHTML = "Refresh token" + req;
    $("#cf_refresh_token_help").textContent = refreshRequired
      ? "Required for Google Drive OAuth. Paste the refresh token from your OAuth consent flow."
      : "Optional. Paste a Google refresh token for a full live token check; otherwise Client ID + Secret are verified.";
  }

  // Key-pair needs username + private key; password field optional (encrypted key passphrase).
  const secretField = $("#cf_secret_access_key");
  const secretWrap = secretField ? secretField.closest(".field") : null;
  if (secretWrap) {
    const optionalPassphrase = type === "key_pair";
    secretWrap.classList.toggle("hidden", false);
    const secretLbl = document.querySelector('label[for="cf_secret_access_key"]');
    if (optionalPassphrase) {
      if (secretLbl) secretLbl.innerHTML = 'Private key passphrase <span style="color:#8a93a3;font-weight:600">(optional)</span>';
      secretField.placeholder = "Only if the PEM key is encrypted";
    } else if (cloud.secretKeyLabel) {
      if (secretLbl) secretLbl.innerHTML = cloud.secretKeyLabel + ' <span class="req">*</span>';
      secretField.placeholder = "";
    } else {
      if (secretLbl) secretLbl.innerHTML = 'Secret access key <span class="req">*</span>';
      secretField.placeholder = "";
    }
  }
  if (type === "key_pair" || type === "password") {
    const accessLbl = document.querySelector('label[for="cf_access_key_id"]');
    if (accessLbl) accessLbl.innerHTML = (cloud.accessKeyLabel || "Username") + ' <span class="req">*</span>';
  }
}

function setSecretKeepHints(isEdit) {
  const hint =
    "Leave blank to keep the saved secret. Enter a new value only if you want to replace it.";
  [
    ["#cf_sa_help", true],
    ["#cf_api_key", false],
    ["#cf_secret_access_key", false],
    ["#cf_client_secret", false],
    ["#cf_refresh_token", false],
  ].forEach(([sel, isHelp]) => {
    const el = $(sel);
    if (!el) return;
    if (isHelp) {
      if (!el.dataset.baseHelp) el.dataset.baseHelp = el.textContent || "";
      el.textContent = isEdit ? hint : el.dataset.baseHelp;
      return;
    }
    const wrap = el.closest(".field");
    if (!wrap) return;
    let tip = wrap.querySelector(".secret-keep-hint");
    if (isEdit) {
      if (!tip) {
        tip = document.createElement("div");
        tip.className = "secret-keep-hint";
        wrap.appendChild(tip);
      }
      tip.textContent = hint;
    } else if (tip) {
      tip.remove();
    }
  });
}

function openPanel(cloudId){
  const cloud = CLOUDS[cloudId];
  activeCloud = cloudId;
  editingConnectorId = null;
  editingConnectorMeta = null;
  form.reset();
  configureForm(cloud);
  setSecretKeepHints(false);
  errBox.classList.add("hidden");
  modalOverlay.classList.remove("hidden");
  document.body.style.overflow = "hidden";
  $("#panelTitle").textContent = "API connectivity";
  $("#submitBtn").textContent = cloud.mode === "upload" ? "Upload & ingest" : "Connect & fetch";

  $$(".cloud-btn").forEach(btn => {
    const open = btn.dataset.cloud === cloudId;
    const c = CLOUDS[btn.dataset.cloud];
    btn.classList.toggle("open", open);
    btn.setAttribute("aria-expanded", open ? "true" : "false");
    btn.querySelector(".hint").textContent = open
      ? (c.mode === "upload" ? "Selecting a file…" : "Editing connectivity details")
      : (c.hint || "Configure API connectivity");
  });

  $("#cf_display_name").focus();
}

async function openPanelForEdit(connectorId) {
  if (!connectorId) return;
  if (typeof fetchConnectorById !== "function") {
    showError("Connector edit API is unavailable. Hard-refresh the page.", true);
    return;
  }
  try {
    const data = await fetchConnectorById(connectorId);
    const item = (data && data.item) || null;
    if (!item) throw new Error("Connector not found.");
    let cloudId = item.cloud || Object.keys(CLOUDS).find((k) => CLOUDS[k].type === item.connector_type);
    // Legacy generic RDBMS → dedicated PostgreSQL / SQL Server tiles
    if (cloudId === "rdbms" || item.connector_type === "rdbms") {
      cloudId = item.engine === "sqlserver" || item.engine === "mssql" ? "sqlserver" : "postgresql";
    }
    const cloud = CLOUDS[cloudId];
    if (!cloud) throw new Error("Unknown connector platform: " + (item.cloud || item.connector_type));

    editingConnectorId = connectorId;
    editingConnectorMeta = item;
    activeCloud = cloudId;
    form.reset();
    configureForm(cloud);
    setSecretKeepHints(true);

    $("#cf_display_name").value = item.display_name || "";
    if ($("#cf_account_id")) $("#cf_account_id").value = item.account_id || "";
    if ($("#cf_region") && item.region) {
      const regionSel = $("#cf_region");
      if (![...regionSel.options].some((o) => o.value === item.region)) {
        const opt = document.createElement("option");
        opt.value = item.region;
        opt.textContent = item.region;
        regionSel.appendChild(opt);
      }
      regionSel.value = item.region;
    }
    if ($("#cf_auth_type") && item.auth_type) {
      $("#cf_auth_type").value = item.auth_type;
      toggleAuth(item.auth_type);
    }
    if ($("#cf_scope")) $("#cf_scope").value = item.dataset_scope || "";
    if ($("#cf_tenant_id")) $("#cf_tenant_id").value = item.tenant_id || "";
    if ($("#cf_resource_group")) $("#cf_resource_group").value = item.resource_group || "";
    if ($("#cf_access_key_id")) $("#cf_access_key_id").value = item.access_key_id || "";
    if ($("#cf_client_id")) $("#cf_client_id").value = item.client_id || "";
    if ($("#cf_role_arn")) $("#cf_role_arn").value = item.role_arn || "";
    if ($("#cf_upload_format") && item.upload_format) $("#cf_upload_format").value = item.upload_format;
    if ($("#cf_upload_notes")) $("#cf_upload_notes").value = item.upload_notes || "";
    if (isDatabaseCloud(cloud)) {
      if ($("#cf_db_port")) {
        $("#cf_db_port").value = item.port || dbDefaultPort(cloud);
      }
      if ($("#cf_db_database")) {
        $("#cf_db_database").value = item.database || "";
      }
      if ($("#cf_account_id") && !item.account_id && item.host) {
        $("#cf_account_id").value = item.host;
      }
    }

    const apis = Array.isArray(item.apis) ? item.apis : [];
    $$('input[name="apis"]').forEach((el) => {
      el.checked = apis.includes(el.value);
    });

    // Secrets are never returned — leave blank intentionally.
    ["#cf_api_key", "#cf_secret_access_key", "#cf_client_secret", "#cf_refresh_token", "#cf_sa_json"].forEach((sel) => {
      if ($(sel)) $(sel).value = "";
    });

    errBox.classList.add("hidden");
    modalOverlay.classList.remove("hidden");
    document.body.style.overflow = "hidden";
    $("#panelTitle").textContent = "Edit connection";
    $("#submitBtn").textContent = "Validate & update";

    $$(".cloud-btn").forEach((btn) => {
      const open = btn.dataset.cloud === cloudId;
      const c = CLOUDS[btn.dataset.cloud];
      btn.classList.toggle("open", open);
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      btn.querySelector(".hint").textContent = open
        ? "Updating saved connection"
        : (c.hint || "Configure API connectivity");
    });
    $("#cf_display_name").focus();
  } catch (err) {
    showError(
      "Could not open connector for edit: " + (err && err.message ? err.message : err),
      true
    );
  }
}

async function deleteConnectorById(connectorId, displayName) {
  if (!connectorId) return;
  if (typeof deleteConnectorFromMongo !== "function") {
    showError("Connector delete API is unavailable. Hard-refresh the page.", true);
    return;
  }
  const label = displayName || connectorId;
  if (!window.confirm('Delete connector "' + label + '"? This cannot be undone.')) {
    return;
  }
  try {
    await deleteConnectorFromMongo(connectorId);
    if (editingConnectorId === connectorId) closePanel();
    showStatus(
      {
        cloud: (editingConnectorMeta && editingConnectorMeta.cloud) || "",
        display_name: label,
        connection_status: "deleted",
      },
      "Connector deleted",
      "ok"
    );
    await renderRecentConnections();
    if (typeof refreshAssetsCatalog === "function") {
      try { await refreshAssetsCatalog(); } catch (_e) { /* ignore */ }
    }
  } catch (err) {
    showError(
      "Could not delete connector: " + (err && err.message ? err.message : err),
      true
    );
  }
}

function setRecentConnectivityStatus(connectorId, kind, message) {
  const cell = document.querySelector(
    '.rc-conn-status[data-connector-id="' + CSS.escape(connectorId) + '"]'
  );
  if (!cell) return;
  cell.className = "rc-conn-status" + (kind ? " " + kind : "");
  cell.textContent = message || "—";
  cell.title = message || "";
}

async function testSavedConnectorConnectivity(connectorId, displayName, triggerBtn) {
  if (!connectorId) return;
  if (typeof testConnectorConnection !== "function") {
    showError("Connection test API is unavailable. Hard-refresh the page.", true);
    return;
  }
  const label = displayName || connectorId;
  const btn = triggerBtn || null;
  const prevLabel = btn ? btn.textContent : "";
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Testing…";
  }
  setRecentConnectivityStatus(connectorId, "pending", "Checking connectivity…");

  try {
    // Uses saved encrypted credentials server-side — no need to re-enter secrets.
    const result = await testConnectorConnection({ connector_id: connectorId });
    const detailBits = [];
    const details = (result && result.details) || {};
    if (details.current_user) detailBits.push("user " + details.current_user);
    if (details.current_account) detailBits.push("account " + details.current_account);
    if (details.engine) detailBits.push(details.engine);
    if (details.host) detailBits.push(details.host + (details.port ? ":" + details.port : ""));
    if (details.database) detailBits.push(details.database);
    if (details.arn) detailBits.push(details.arn);
    if (details.client_email) detailBits.push(details.client_email);
    const msg =
      (result && result.message ? result.message : "Connection successful") +
      (detailBits.length ? " · " + detailBits.join(" · ") : "");
    setRecentConnectivityStatus(connectorId, "ok", msg);
    showStatus(
      {
        cloud: details.platform || "",
        display_name: label,
        account_id: details.account || details.current_account || "",
        region: details.region || "",
        auth_type: details.auth_type || "",
        apis: [],
        connection_status: "validated",
      },
      "Connectivity OK",
      "ok",
      { ok: true, id: connectorId }
    );
  } catch (err) {
    const raw = err && err.message ? err.message : String(err);
    setRecentConnectivityStatus(connectorId, "err", raw);
    showStatus(
      {
        display_name: label,
        connection_status: "failed",
      },
      "Connectivity failed",
      "err"
    );
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = prevLabel || "Test";
    }
  }
}

function closePanel(){
  modalOverlay.classList.add("hidden");
  document.body.style.overflow = "";
  activeCloud = null;
  editingConnectorId = null;
  editingConnectorMeta = null;
  clearUploadSelection();
  setSecretKeepHints(false);
  $$(".cloud-btn").forEach(btn => {
    const c = CLOUDS[btn.dataset.cloud];
    btn.classList.remove("open");
    btn.setAttribute("aria-expanded", "false");
    btn.querySelector(".hint").textContent = c.hint || "Configure API connectivity";
  });
}

$("#panelCloseBtn").addEventListener("click", closePanel);
$("#cancelBtn").addEventListener("click", closePanel);
modalOverlay.addEventListener("click", (e)=>{
  if (e.target === modalOverlay) closePanel();
});
document.addEventListener("keydown", (e)=>{
  if (e.key === "Escape" && !modalOverlay.classList.contains("hidden")) closePanel();
});
$("#cf_auth_type").addEventListener("change", (e)=> toggleAuth(e.target.value));

const recentBody = $("#recentConnectionsBody");
if (recentBody) {
  recentBody.addEventListener("click", (e) => {
    const testBtn = e.target.closest(".rc-test");
    if (testBtn && testBtn.dataset.connectorId) {
      e.preventDefault();
      testSavedConnectorConnectivity(
        testBtn.dataset.connectorId,
        testBtn.dataset.connectorName || "",
        testBtn
      );
      return;
    }
    const editBtn = e.target.closest(".rc-edit");
    if (editBtn && editBtn.dataset.connectorId) {
      e.preventDefault();
      openPanelForEdit(editBtn.dataset.connectorId);
      return;
    }
    const delBtn = e.target.closest(".rc-delete");
    if (delBtn && delBtn.dataset.connectorId) {
      e.preventDefault();
      deleteConnectorById(delBtn.dataset.connectorId, delBtn.dataset.connectorName || "");
    }
  });
}

function formatSavedAt(iso){
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return escapeHtml(String(iso));
  return escapeHtml(d.toLocaleString());
}

function cloudLabel(cloudId){
  if (!cloudId) return "—";
  const c = CLOUDS[cloudId];
  return escapeHtml(c ? (c.name || c.short || cloudId) : cloudId);
}

function cellText(val){
  if (val == null || val === "") return "—";
  return escapeHtml(String(val));
}

const RECENT_CONNECTIONS_LIMIT = 500;
let editingConnectorId = null;
let editingConnectorMeta = null;

function renderRecentConnectionsFromItems(items) {
  const body = $("#recentConnectionsBody");
  if (!body) return;
  paintRecentConnectionsTable(body, items || []);
}

function paintRecentConnectionsTable(body, items) {
  if (!items.length) {
    body.innerHTML = '<div class="recent-empty">No connections saved yet.</div>';
    return;
  }
  const rows = items.map(function (it) {
      const id = it.id || "";
      const notes = it.upload_notes
        ? '<span title="' + escapeHtml(it.upload_notes) + '">' +
          escapeHtml(String(it.upload_notes).length > 48
            ? String(it.upload_notes).slice(0, 45) + "…"
            : it.upload_notes) +
          "</span>"
        : "—";
      const nameAttr = escapeHtml(it.display_name || id);
      const actions = id
        ? '<div class="rc-actions">' +
          '<button type="button" class="btn btn-test rc-test" data-connector-id="' +
          escapeHtml(id) +
          '" data-connector-name="' +
          nameAttr +
          '" title="Test connectivity with saved credentials">Test</button>' +
          '<button type="button" class="btn btn-ghost rc-edit" data-connector-id="' +
          escapeHtml(id) +
          '">Edit</button>' +
          '<button type="button" class="btn btn-danger rc-delete" data-connector-id="' +
          escapeHtml(id) +
          '" data-connector-name="' +
          nameAttr +
          '">Delete</button>' +
          "</div>"
        : "—";
      const statusCell = id
        ? '<td class="rc-conn-status pending" data-connector-id="' +
          escapeHtml(id) +
          '">Not tested</td>'
        : "<td>—</td>";
      return (
        "<tr data-connector-id=\"" + escapeHtml(id) + "\">" +
        "<td>" + cloudLabel(it.cloud) + "</td>" +
        "<td>" + cellText(it.connector_type) + "</td>" +
        '<td class="nm">' + cellText(it.display_name) + "</td>" +
        "<td>" + cellText(it.mode) + "</td>" +
        "<td>" + cellText(it.region || it.account_id) + "</td>" +
        "<td>" + notes + "</td>" +
        "<td>" + cellText(it.user) + "</td>" +
        "<td>" + formatSavedAt(it.updated_at || it.saved_at) + "</td>" +
        statusCell +
        "<td>" + actions + "</td>" +
        "</tr>"
      );
    }).join("");
  body.innerHTML =
    '<table class="recent-table" aria-label="All Connections">' +
    "<thead><tr>" +
    "<th>Cloud</th><th>Connector type</th><th>Display name</th><th>Mode</th>" +
    "<th>Region / account</th><th>Upload notes</th><th>User</th><th>Updated</th>" +
    "<th>Connectivity</th><th>Actions</th>" +
    "</tr></thead><tbody>" +
    rows +
    "</tbody></table>";
}

async function renderRecentConnections(){
  const body = $("#recentConnectionsBody");
  if (!body) return;
  const loader =
    typeof fetchAllConnectors === "function"
      ? fetchAllConnectors
      : typeof fetchRecentConnectors === "function"
        ? fetchRecentConnectors
        : null;
  if (!loader) {
    body.innerHTML = '<div class="recent-empty">Connections list unavailable.</div>';
    return;
  }
  try {
    const data = await loader(RECENT_CONNECTIONS_LIMIT);
    paintRecentConnectionsTable(body, (data && data.items) || []);
  } catch (err) {
    body.innerHTML =
      '<div class="recent-empty">Could not load connections. ' +
      escapeHtml(err && err.message ? err.message : String(err)) +
      "</div>";
  }
}

function showError(msg, skipLog){
  errBox.textContent = msg;
  errBox.classList.remove("hidden");
  if (skipLog || typeof logConnectionFailure !== "function") return;
  void logConnectionFailure({
    message: msg,
    event: "connection.validation_failed",
    error_type: "validation",
    context: {
      cloud: activeCloud || null,
      connector_type: CLOUDS[activeCloud] ? CLOUDS[activeCloud].type : null,
      connection_status: "failed"
    }
  });
}

function connectionLogContext(payload, extra){
  return Object.assign({
    cloud: payload.cloud,
    connector_type: payload.connector_type,
    display_name: payload.display_name,
    mode: payload.mode
  }, extra || {});
}

form.addEventListener("submit", async (e)=>{
  e.preventDefault();
  errBox.classList.add("hidden");
  const cloud = CLOUDS[activeCloud];
  if (!cloud) return;

  const displayName = $("#cf_display_name").value.trim();
  if (!displayName) return showError("Connection name is required.");

  let payload;

  if (cloud.mode === "upload") {
    if (!selectedUploadFile) return showError("Please select a file to upload.");
    payload = {
      connector_type: cloud.type,
      cloud: cloud.id,
      mode: "upload",
      display_name: displayName,
      file_name: selectedUploadFile.name,
      file_size: selectedUploadFile.size,
      file_type: selectedUploadFile.type || "",
      upload_format: $("#cf_upload_format").value,
      upload_notes: $("#cf_upload_notes").value.trim(),
      account_id: selectedUploadFile.name,
      region: "local",
      auth_type: "file_upload",
      apis: ["file_ingest"]
    };
  } else {
    const accountId = $("#cf_account_id").value.trim();
    const region = $("#cf_region").value;
    const authType = $("#cf_auth_type").value;
    const scope = $("#cf_scope").value.trim();
    const apis = $$('input[name="apis"]:checked').map(el => el.value);
    const tenantId = $("#cf_tenant_id").value.trim();
    const resourceGroup = $("#cf_resource_group").value.trim();

    if (!accountId) return showError(cloud.accountLabel + " is required.");
    if (!apis.length) return showError("Select at least one service to fetch from.");

    if ((cloud.needsTenant || cloud.id === "azure") && !tenantId) {
      return showError("Tenant ID is required.");
    }

    const isDb = isDatabaseCloud(cloud);
    let engine = "";
    let port = "";
    let database = "";
    if (isDb) {
      engine = dbCloudEngine(cloud);
      port = ($("#cf_db_port") && $("#cf_db_port").value.trim()) || dbDefaultPort(cloud);
      database = ($("#cf_db_database") && $("#cf_db_database").value.trim()) || "";
      if (!/^\d+$/.test(port)) return showError("Port must be a number.");
      if (!database) {
        return showError(
          cloud.id === "mongodb"
            ? "Database name is required (auth / catalog database)."
            : "Database name is required."
        );
      }
    }

    const isEdit = Boolean(editingConnectorId);
    const keepSecrets = isEdit; // blank secrets mean "keep existing" on update

    if (authType === "service_account") {
      const raw = $("#cf_sa_json").value.trim();
      if (!raw && !keepSecrets) return showError("Paste a service account JSON key.");
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (cloud.id === "gcp" && parsed.type && parsed.type !== "service_account") {
            return showError('JSON "type" should be "service_account".');
          }
        } catch {
          return showError("Service account JSON is not valid JSON.");
        }
      }
    } else if (authType === "key_pair") {
      if (!$("#cf_access_key_id").value.trim()) {
        return showError((cloud.accessKeyLabel || "Username") + " is required.");
      }
      const raw = $("#cf_sa_json").value.trim();
      if (!raw && !keepSecrets) return showError("Private key (PEM) is required.");
      if (raw && !/BEGIN ([A-Z ]*PRIVATE KEY|RSA PRIVATE KEY)/.test(raw)) {
        return showError("Private key should be PEM format (BEGIN PRIVATE KEY).");
      }
    } else if (authType === "api_key") {
      if (!$("#cf_api_key").value.trim() && !keepSecrets) {
        return showError((cloud.apiKeyLabel || "API key") + " is required.");
      }
    } else if (authType === "oauth2" || authType === "service_principal") {
      if (!$("#cf_client_id").value.trim()) {
        return showError("Client ID is required.");
      }
      if (!$("#cf_client_secret").value.trim() && !keepSecrets) {
        return showError("Client secret is required.");
      }
      if (
        cloud.id === "googledrive" &&
        !$("#cf_refresh_token").value.trim() &&
        !keepSecrets
      ) {
        return showError("Refresh token is required for Google Drive OAuth.");
      }
    } else if (authType === "access_keys") {
      if (!$("#cf_access_key_id").value.trim()) {
        return showError("Access key ID is required.");
      }
      if (!$("#cf_secret_access_key").value.trim() && !keepSecrets) {
        return showError("Secret access key is required.");
      }
    } else if (authType === "password") {
      if (!$("#cf_access_key_id").value.trim()) {
        return showError((cloud.accessKeyLabel || "Username") + " is required.");
      }
      if (!$("#cf_secret_access_key").value.trim() && !keepSecrets) {
        return showError((cloud.secretKeyLabel || "Password") + " is required.");
      }
    } else if (authType === "iam_role" || authType === "assume_role") {
      if (!$("#cf_role_arn").value.trim()) return showError("IAM role ARN is required.");
    } else if (authType === "client_certificate") {
      if (!$("#cf_sa_json").value.trim() && !keepSecrets) {
        return showError("Client certificate / JSON is required.");
      }
    }

    payload = {
      connector_type: cloud.type,
      cloud: cloud.id,
      mode: isDb ? "database" : (cloud.mode || "cloud"),
      display_name: displayName,
      account_id: accountId,
      region: isDb ? "on-prem" : region,
      auth_type: authType,
      apis,
      dataset_scope: scope,
      tenant_id: tenantId,
      resource_group: resourceGroup,
      api_key: $("#cf_api_key").value,
      client_id: $("#cf_client_id").value,
      client_secret: $("#cf_client_secret").value,
      refresh_token: $("#cf_refresh_token") ? $("#cf_refresh_token").value : "",
      service_account_json: $("#cf_sa_json").value,
      access_key_id: $("#cf_access_key_id").value,
      secret_access_key: $("#cf_secret_access_key").value,
      role_arn: $("#cf_role_arn").value,
      host: isDb ? accountId : "",
      port: isDb ? port : "",
      database: isDb ? database : "",
      engine: isDb ? engine : ""
    };
  }

  const btn = $("#submitBtn");
  const isEdit = Boolean(editingConnectorId);
  const busyLabel = cloud.mode === "upload" ? "Uploading…" : "Validating…";
  const idleLabel = isEdit
    ? "Validate & update"
    : cloud.mode === "upload"
      ? "Upload & ingest"
      : "Connect & fetch";
  btn.disabled = true;
  btn.textContent = busyLabel;

  try {
    if (typeof saveConnectorToMongo !== "function") {
      throw new Error("save-connector.js is not loaded.");
    }
    if (typeof testConnectorConnection !== "function") {
      throw new Error("save-connector.js is missing connection test support. Hard-refresh the page.");
    }

    // Live handshake with the target system before persisting credentials.
    if (cloud.mode !== "upload") {
      btn.textContent = "Validating connection…";
      const testPayload = Object.assign({}, payload);
      if (isEdit) testPayload.connector_id = editingConnectorId;
      const testResult = await testConnectorConnection(testPayload);
      payload.connection_status = "validated";
      payload.validation_message = (testResult && testResult.message) || "Connection validated";
      payload.validation_details = (testResult && testResult.details) || {};
    }

    btn.textContent = isEdit ? "Updating…" : cloud.mode === "upload" ? "Uploading…" : "Saving…";
    let saveResult;
    if (isEdit) {
      if (typeof updateConnectorInMongo !== "function") {
        throw new Error("Connector update API is unavailable. Hard-refresh the page.");
      }
      saveResult = await updateConnectorInMongo(editingConnectorId, payload);
    } else {
      saveResult = await saveConnectorToMongo(
        payload,
        cloud.mode === "upload" ? selectedUploadFile : null
      );
    }

    try {
      const toStore = {
        cloud: payload.cloud,
        connector_type: payload.connector_type,
        display_name: payload.display_name,
        account_id: payload.account_id,
        region: payload.region,
        auth_type: payload.auth_type,
        apis: payload.apis,
        dataset_scope: payload.dataset_scope,
        tenant_id: payload.tenant_id,
        resource_group: payload.resource_group,
        mode: payload.mode,
        file_name: payload.file_name,
        file_size: payload.file_size,
        upload_format: payload.upload_format,
        upload_notes: payload.upload_notes,
        saved_at: new Date().toISOString()
      };
      sessionStorage.setItem("datahive_cloud_connection", JSON.stringify(toStore));
    } catch { /* ignore quota */ }

    closePanel();
    const statusLabel = isEdit
      ? "Validated & updated"
      : cloud.mode === "upload"
        ? "Uploaded — ingest queued"
        : "Validated & connected — fetch queued";
    showStatus(
      Object.assign({}, payload, {
        connection_status: saveResult.connection_status || payload.connection_status || "connected",
      }),
      statusLabel,
      "ok",
      saveResult
    );
    renderRecentConnections();
    if (typeof refreshAssetsCatalog === "function") {
      try { await refreshAssetsCatalog(); } catch (_e) { /* ignore */ }
    }

    console.info("[Source] connection configured", {
      cloud: payload.cloud,
      display_name: payload.display_name,
      account_id: payload.account_id,
      region: payload.region,
      auth_type: payload.auth_type,
      apis: payload.apis,
      file_name: payload.file_name
    });
  } catch (err) {
    const raw = err && err.message ? err.message : String(err);
    const isValidation =
      /authentication failed|connection failed|is required|not installed|OAuth|invalid/i.test(raw) &&
      !/MongoDB|save connector/i.test(raw);
    const msg = isValidation
      ? "Connection validation failed: " + raw
      : "Could not save connector to MongoDB: " + raw;
    if (typeof logConnectionFailure === "function") {
      await logConnectionFailure({
        message: msg,
        event: isValidation ? "connection.validate_failed" : "connection.save_failed",
        error_type: isValidation ? "auth" : "save",
        context: connectionLogContext(payload, { connection_status: "failed" })
      });
    }
    showError(msg, true);
    showStatus(
      Object.assign({}, payload, { connection_status: "failed" }),
      isValidation ? "Validation failed" : "Connection failed",
      "err"
    );
  } finally {
    btn.disabled = false;
    btn.textContent = idleLabel;
  }
});

function authLabel(cloudId, authType){
  const opt = (CLOUDS[cloudId]?.auth || []).find(a => a.value === authType);
  return opt ? opt.label : authType;
}

function showStatus(payload, pillText, pillKind, saveResult){
  const cloud = CLOUDS[payload.cloud] || Object.values(CLOUDS).find(c => c.type === payload.connector_type);
  $("#statusTitle").textContent = payload.display_name;
  let mongoLine = "";
  if (saveResult && saveResult.ok) {
    mongoLine =
      "<br><strong>MongoDB:</strong> " +
      escapeHtml((saveResult.db || "?") + "." + (saveResult.collection || "connectors")) +
      (saveResult.id ? " · <strong>id:</strong> " + escapeHtml(saveResult.id) : "") +
      (saveResult.upload_relative_path
        ? " · <strong>file:</strong> " + escapeHtml(saveResult.upload_relative_path)
        : "");
  }

  if (payload.mode === "upload" || payload.cloud === "upload") {
    $("#statusMeta").innerHTML =
      "<strong>Source:</strong> File Upload" +
      " · <strong>File:</strong> " + escapeHtml(payload.file_name || payload.account_id || "") +
      (payload.file_size != null ? " · <strong>Size:</strong> " + escapeHtml(formatBytes(payload.file_size)) : "") +
      (payload.upload_format
        ? "<br><strong>Format:</strong> " + escapeHtml(payload.upload_format)
        : "") +
      (payload.upload_notes
        ? "<br><strong>Notes:</strong> " + escapeHtml(payload.upload_notes)
        : "") +
      mongoLine;
  } else if (
    payload.mode === "database" ||
    payload.cloud === "postgresql" ||
    payload.cloud === "sqlserver" ||
    payload.cloud === "mongodb" ||
    payload.cloud === "rdbms"
  ) {
    const dbLabel =
      payload.cloud === "sqlserver"
        ? "SQL Server"
        : payload.cloud === "mongodb" || payload.engine === "mongodb"
          ? "MongoDB"
          : payload.cloud === "postgresql" || payload.engine === "postgresql"
            ? "PostgreSQL"
            : (cloud && cloud.short) || "Database";
    $("#statusMeta").innerHTML =
      "<strong>Source:</strong> " + escapeHtml(dbLabel) +
      "<br><strong>Host:</strong> " + escapeHtml(payload.host || payload.account_id || "") +
      " · <strong>Port:</strong> " + escapeHtml(String(payload.port || "")) +
      " · <strong>Database:</strong> " + escapeHtml(payload.database || "") +
      (payload.dataset_scope
        ? "<br><strong>Schema scope:</strong> " + escapeHtml(payload.dataset_scope)
        : "") +
      mongoLine;
  } else {
    const accountLabel = cloud ? cloud.accountLabel : "Account";
    $("#statusMeta").innerHTML =
      "<strong>Source:</strong> " + escapeHtml(cloud ? cloud.short : payload.cloud) +
      " · <strong>" + escapeHtml(accountLabel) + ":</strong> " + escapeHtml(payload.account_id) +
      " · <strong>Region:</strong> " + escapeHtml(payload.region) + "<br>" +
      "<strong>Auth:</strong> " + escapeHtml(authLabel(payload.cloud, payload.auth_type)) +
      " · <strong>Services:</strong> " + escapeHtml((payload.apis||[]).join(", ")) +
      (payload.dataset_scope
        ? "<br><strong>Scope:</strong> " + escapeHtml(payload.dataset_scope)
        : "") +
      mongoLine;
  }

  if (payload.connection_status) {
    $("#statusMeta").innerHTML +=
      "<br><strong>Status:</strong> " + escapeHtml(payload.connection_status);
  }

  const pill = $("#statusPill");
  pill.className = "pill " + (pillKind || "pending");
  pill.textContent = pillText;
  statusEl.classList.remove("hidden");

  if (payload.connection_status === "failed") {
    $("#statusTitle").textContent = payload.display_name || "Connection";
  }
}

function escapeHtml(s){
  return String(s)
    .replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

try {
  const saved = JSON.parse(sessionStorage.getItem("datahive_cloud_connection") || "null")
    || (() => {
      const legacy = JSON.parse(sessionStorage.getItem("datahive_gcp_connection") || "null");
      if (!legacy) return null;
      return {
        cloud: "gcp",
        connector_type: "googlecloud",
        display_name: legacy.display_name,
        account_id: legacy.project_id,
        region: legacy.region,
        auth_type: legacy.auth_type,
        apis: legacy.apis,
        dataset_scope: legacy.dataset_scope
      };
    })();
  if (saved) showStatus(saved, "Previously configured", "pending");
} catch { /* ignore */ }

/* ---------- Assets (multi-connector catalog via connector API) ---------- */
const CONFIGURED_ASSET_SCHEMAS = ["bronze", "silver", "gold"];
const assetState = {
  offline: false,
  loaded: false,
  schema: null,
  table: null,
  connectorId: "all",
  connectors: [],
  catalogItems: [],
};

function currentAssetConnectorId() {
  const sel = $("#assetConnectorSelect");
  return (sel && sel.value) || assetState.connectorId || "all";
}

function mergedAssetSchemas(apiItems) {
  const fromApi = (apiItems || []).map((s) => String(s)).filter(Boolean);
  const source = fromApi.length ? fromApi : CONFIGURED_ASSET_SCHEMAS;
  const out = [];
  const seen = new Set();
  source.forEach((s) => {
    const key = String(s).toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(String(s));
  });
  return out;
}

function fillAssetSchemaSelect(schemas) {
  const sel = $("#assetSchemaSelect");
  if (!sel) return;
  const list = schemas && schemas.length ? schemas : [];
  sel.innerHTML =
    '<option value="">Select schema…</option>' +
    list.map((s) => '<option value="' + escapeHtml(s) + '">' + escapeHtml(s) + "</option>").join("");
}

function formatAssetApiError(err) {
  const m = err && err.message ? err.message : String(err);
  if (/404|route not found|not found/i.test(m)) {
    return (
      "Connector API is missing Assets routes (404). " +
      "Stop any old server on port 5055, then run: python -m api"
    );
  }
  if (/password authentication failed/i.test(m)) {
    return (
      "PostgreSQL login failed. Update POSTGRES_USER / POSTGRES_PASSWORD " +
      "(or POSTGRES_CONNINFO) in .env, then restart the API (python -m api)."
    );
  }
  return "Assets / connector API error: " + m;
}

function renderAssetSummary(counts, schemaCount, connectorCount) {
  const connEl = $("#assetSummaryConnectors");
  const schemasEl = $("#assetSummarySchemas");
  const viewsEl = $("#assetSummaryViews");
  const tablesEl = $("#assetSummaryTables");
  if (connEl) connEl.textContent = connectorCount != null ? String(connectorCount) : "—";
  if (schemasEl) schemasEl.textContent = schemaCount != null ? String(schemaCount) : "—";
  if (viewsEl) viewsEl.textContent = counts && counts.View != null ? String(counts.View) : "—";
  if (tablesEl) tablesEl.textContent = counts && counts.Table != null ? String(counts.Table) : "—";
}

function fillAssetConnectorSelect(connectors) {
  const sel = $("#assetConnectorSelect");
  if (!sel) return;
  const prev = assetState.connectorId || "all";
  const opts =
    '<option value="all">All connectors</option>' +
    (connectors || [])
      .map((c) => {
        const label =
          (c.display_name || c.id) +
          (c.platform || c.cloud ? " · " + (c.platform || c.cloud) : "");
        return (
          '<option value="' +
          escapeHtml(c.id) +
          '">' +
          escapeHtml(label) +
          "</option>"
        );
      })
      .join("");
  sel.innerHTML = opts;
  if ([...sel.options].some((o) => o.value === prev)) sel.value = prev;
  else sel.value = "all";
  assetState.connectorId = sel.value;
  updateAssetConnectorHelp();
}

function updateAssetConnectorHelp() {
  const help = $("#assetConnectorHelp");
  if (!help) return;
  const id = currentAssetConnectorId();
  if (id === "all") {
    help.textContent = "Showing assets you can access across all connectors.";
    return;
  }
  const conn = (assetState.connectors || []).find((c) => c.id === id);
  if (!conn) {
    help.textContent = "Filtered to the selected connector.";
    return;
  }
  help.textContent =
    "Filtered to " +
    (conn.display_name || id) +
    " (" +
    (conn.platform || conn.cloud || "connector") +
    ")" +
    (conn.structure_supported
      ? " — live structure available."
      : " — metadata from glossary / scope.");
}

function renderAssetBrowser(items) {
  const box = $("#assetBrowser");
  if (!box) return;
  const list = items || [];
  assetState.catalogItems = list;
  if (!list.length) {
    box.innerHTML =
      '<div class="ab-empty">No assets for this connector yet. Save a connector, upload glossary terms, or browse Local Postgres.</div>';
    return;
  }
  box.innerHTML = list
    .slice(0, 200)
    .map((a, idx) => {
      const active =
        assetState.schema &&
        assetState.table &&
        String(a.schema || "").toLowerCase() === String(assetState.schema).toLowerCase() &&
        String(a.name || "").toLowerCase() === String(assetState.table).toLowerCase() &&
        (currentAssetConnectorId() === "all" ||
          a.connector_id === currentAssetConnectorId());
      return (
        '<button type="button" class="ab-row' +
        (active ? " active" : "") +
        '" data-asset-idx="' +
        idx +
        '">' +
        '<div class="ab-main">' +
        '<div class="ab-name">' +
        escapeHtml(a.name || "—") +
        "</div>" +
        '<div class="ab-crumb">' +
        escapeHtml(
          (a.connector_name ? a.connector_name + " · " : "") +
            (a.crumb || [a.schema, a.name].filter(Boolean).join("."))
        ) +
        "</div></div>" +
        '<span class="ab-pill">' +
        escapeHtml(a.platform || a.type || "asset") +
        "</span></button>"
      );
    })
    .join("");
}

async function refreshAssetsCatalog() {
  if (typeof ensureDataHiveConnectorApi === "function") {
    await ensureDataHiveConnectorApi();
  }
  await loadAssetConnectors();
  await loadAssetCatalog();
}

async function loadAssetConnectors() {
  try {
    if (typeof DataHiveAssets === "undefined") throw new Error("Assets API not loaded");
    const data = await DataHiveAssets.connectors();
    assetState.connectors = data.items || [];
    fillAssetConnectorSelect(assetState.connectors);
  } catch (err) {
    assetState.connectors = [
      {
        id: "local-postgres",
        display_name: "Local Postgres",
        platform: "postgres",
        structure_supported: true,
      },
    ];
    fillAssetConnectorSelect(assetState.connectors);
    console.warn("[assets] connector list failed", err);
  }
}

async function loadAssetCatalog() {
  const connectorId = currentAssetConnectorId();
  assetState.connectorId = connectorId;
  try {
    if (typeof DataHiveAssets === "undefined") throw new Error("Assets API not loaded");
    const data = await DataHiveAssets.catalog(connectorId);
    const schemas = mergedAssetSchemas(data.schemas || data.items || []);
    // Prefer explicit schemas list; if catalog returns assets, derive schemas.
    let schemaList = data.schemas || [];
    if (!schemaList.length && Array.isArray(data.items)) {
      schemaList = [...new Set(data.items.map((i) => i.schema).filter(Boolean))];
    }
    schemaList = mergedAssetSchemas(schemaList);
    renderAssetSummary(
      data.counts || {},
      schemaList.length,
      data.connector_count != null ? data.connector_count : (assetState.connectors || []).length
    );
    fillAssetSchemaSelect(schemaList);
    renderAssetBrowser(data.items || []);
    assetState.offline = false;
    const pgBanner = $("#pgBanner");
    if (pgBanner) pgBanner.classList.add("hidden");
    updateAssetConnectorHelp();
  } catch (err) {
    assetState.offline = true;
    renderAssetSummary(null, null, null);
    fillAssetSchemaSelect(mergedAssetSchemas([]));
    renderAssetBrowser([]);
    const pgBanner = $("#pgBanner");
    if (pgBanner) {
      pgBanner.classList.remove("hidden");
      pgBanner.textContent = formatAssetApiError(err);
    }
  }
}

async function loadAssetCounts() {
  await loadAssetCatalog();
}

function assetEl(tag, cls) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  return e;
}

function assetSkeleton(elm, rows) {
  elm.innerHTML = "";
  for (let i = 0; i < rows; i++) elm.appendChild(assetEl("div", "sk sk-row"));
}

function metaPill(text, cls) {
  if (text == null || text === "") return "";
  return '<span class="meta-pill' + (cls ? " " + cls : "") + '">' + escapeHtml(String(text)) + "</span>";
}

function metaItem(label, value, span2) {
  if (value == null || value === "") return "";
  return (
    '<div class="mi' + (span2 ? " span2" : "") + '">' +
    '<span class="lbl">' + escapeHtml(label) + "</span>" +
    '<span class="val">' + escapeHtml(String(value)) + "</span></div>"
  );
}

function renderColumnMetadata(meta) {
  if (!meta || typeof meta !== "object") return "";
  const tags = [];
  if (meta.classification) {
    tags.push(metaPill(meta.classification, /pii/i.test(String(meta.classification)) ? "pii" : ""));
  }
  if (meta.sensitivity) {
    tags.push(metaPill(meta.sensitivity, /confidential|restricted/i.test(String(meta.sensitivity)) ? "conf" : ""));
  }
  if (meta.is_primary_key) tags.push(metaPill("Primary key", "ok"));
  if (meta.is_unique) tags.push(metaPill("Unique", "ok"));
  if (meta.is_nullable === false) tags.push(metaPill("Not null", ""));
  if (meta.is_nullable === true) tags.push(metaPill("Nullable", ""));

  const rulesHtml = Array.isArray(meta.quality_rules) && meta.quality_rules.length
    ? metaItem("Quality rules", meta.quality_rules.join(" · "), true)
    : "";

  const body =
    metaItem("Business name", meta.business_name) +
    metaItem("Business definition", meta.business_definition, true) +
    metaItem("Description", meta.description, true) +
    metaItem("Data type", meta.data_type) +
    metaItem("Source system", meta.source_system) +
    metaItem("Owner", meta.owner) +
    metaItem("Steward", meta.steward) +
    (tags.length ? '<div class="mi span2"><span class="lbl">Flags</span><div class="tags">' + tags.join("") + "</div></div>" : "") +
    rulesHtml;

  if (!body) {
    return '<div class="col-meta">' + metaItem("Comment", meta.description || JSON.stringify(meta), true) + "</div>";
  }
  return '<div class="col-meta">' + body + "</div>";
}

function renderTableStructure(structure) {
  const wrap = $("#assetStructureWrap");
  if (!wrap) return;
  if (!structure || !Array.isArray(structure.columns) || !structure.columns.length) {
    wrap.innerHTML = '<div class="state">This table has no columns to display.</div>';
    return;
  }
  const rows = structure.columns
    .map((c) => {
      const nullCls = c.nullable ? "nullable-yes" : "nullable-no";
      const nullTxt = c.nullable ? "Yes" : "No";
      const meta = c.metadata || null;
      const bizName = meta && meta.business_name ? meta.business_name : "";
      const desc = meta && meta.description ? meta.description : (c.comment && !meta ? c.comment : "");
      const classif = meta && meta.classification ? meta.classification : "";
      const sens = meta && meta.sensitivity ? meta.sensitivity : "";
      const hasDetail = !!(meta && (meta.business_definition || meta.owner || meta.steward ||
        meta.source_system || meta.quality_rules || meta.data_type || meta.is_primary_key != null ||
        meta.is_unique != null || meta.is_nullable != null));
      const main =
        "<tr" + (hasDetail || desc ? ' class="has-meta"' : "") + ">" +
        '<td class="colname">' +
        escapeHtml(c.name) +
        (c.primary_key ? '<span class="pk">PK</span>' : "") +
        (bizName ? '<div class="biz">' + escapeHtml(bizName) + "</div>" : "") +
        (desc ? '<div class="meta-desc">' + escapeHtml(desc) + "</div>" : "") +
        "</td>" +
        '<td class="dtype">' + escapeHtml(c.type) + "</td>" +
        '<td class="' + nullCls + '">' + nullTxt + "</td>" +
        "<td>" + (c.default != null ? escapeHtml(String(c.default)) : "—") + "</td>" +
        "<td>" + (classif ? metaPill(classif, /pii/i.test(classif) ? "pii" : "") : "—") + "</td>" +
        "<td>" + (sens ? metaPill(sens, /confidential|restricted/i.test(sens) ? "conf" : "") : "—") + "</td>" +
        "</tr>";
      if (!hasDetail) return main;
      return (
        main +
        '<tr class="meta-row"><td colspan="6">' + renderColumnMetadata(meta) + "</td></tr>"
      );
    })
    .join("");
  wrap.innerHTML =
    '<div class="structure-hd">' +
    '<span class="snm">' + escapeHtml(structure.schema) + "." + escapeHtml(structure.table) + "</span>" +
    '<span class="stype">' + escapeHtml(structure.table_type || "Table") + "</span>" +
    (structure.connector_name
      ? '<span class="stype">' + escapeHtml(structure.connector_name) + "</span>"
      : "") +
    (structure.platform
      ? '<span class="stype">' + escapeHtml(structure.platform) + "</span>"
      : "") +
    "</div>" +
    (structure.note
      ? '<p class="asset-table-meta" style="margin:0 0 10px">' + escapeHtml(structure.note) + "</p>"
      : "") +
    '<table class="structure-table" aria-label="Table structure and metadata">' +
    "<thead><tr><th>Column</th><th>Type</th><th>Nullable</th><th>Default</th><th>Classification</th><th>Sensitivity</th></tr></thead>" +
    "<tbody>" + rows + "</tbody></table>";
}

async function onTableSelected(schema, table, connectorId) {
  const wrap = $("#assetStructureWrap");
  if (!wrap) return;
  if (!table) {
    wrap.innerHTML = '<div class="state">Pick a connector, then a schema and table — or choose an asset from the list.</div>';
    return;
  }
  const cid = connectorId || currentAssetConnectorId();
  wrap.innerHTML = '<div class="state">Loading table structure…</div>';
  try {
    if (typeof DataHiveAssets === "undefined") throw new Error("Assets API not loaded");
    const structure = await DataHiveAssets.structure(
      schema,
      table,
      cid === "all" ? "local-postgres" : cid
    );
    renderTableStructure(structure);
    renderAssetBrowser(assetState.catalogItems);
  } catch (err) {
    wrap.innerHTML =
      '<div class="state">Could not load structure: ' +
      escapeHtml(err && err.message ? err.message : String(err)) +
      "</div>";
  }
}

async function populateTableSelect(schema) {
  const select = $("#assetTableSelect");
  const wrap = $("#assetStructureWrap");
  const meta = $("#assetTableMeta");
  if (!select) return;
  select.disabled = true;
  select.innerHTML = '<option value="">Loading tables…</option>';
  if (meta) {
    meta.classList.add("hidden");
    meta.classList.remove("err");
    meta.textContent = "";
  }
  if (wrap) {
    wrap.innerHTML =
      '<div class="state">Pick a connector, then a schema and table — or choose an asset from the list.</div>';
  }
  assetState.table = null;

  let tables = [];
  try {
    if (typeof DataHiveAssets === "undefined") throw new Error("Assets API not loaded");
    const data = await DataHiveAssets.tables(schema, currentAssetConnectorId());
    tables = data.items || [];
    if (meta) {
      if (data.note && !tables.length) {
        meta.textContent = data.note;
        meta.classList.remove("hidden");
      } else if (data.count != null) {
        meta.textContent =
          data.count + " object" + (data.count === 1 ? "" : "s") + " in " + schema;
        meta.classList.remove("hidden");
      }
    }
    assetState.offline = false;
  } catch (err) {
    select.innerHTML = '<option value="">Failed to load tables</option>';
    if (meta) {
      meta.textContent = formatAssetApiError(err);
      meta.classList.remove("hidden");
      meta.classList.add("err");
    }
    return;
  }

  if (!tables.length) {
    select.innerHTML = '<option value="">No tables found in this schema</option>';
    select.disabled = true;
    if (wrap) {
      wrap.innerHTML =
        '<div class="state">Schema <strong>' +
        escapeHtml(schema) +
        "</strong> is reachable, but it has no tables or views for this Snowflake role.</div>";
    }
    return;
  }
  select.innerHTML =
    '<option value="">Select table… (' + tables.length + ")</option>" +
    tables
      .map((t) => {
        const label =
          t.name +
          " (" +
          (t.type || "Table") +
          (t.connector_name && currentAssetConnectorId() === "all"
            ? " · " + t.connector_name
            : "") +
          ")";
        return (
          '<option value="' +
          escapeHtml(t.name) +
          '" data-connector-id="' +
          escapeHtml(t.connector_id || currentAssetConnectorId()) +
          '">' +
          escapeHtml(label) +
          "</option>"
        );
      })
      .join("");
  select.disabled = false;
}

async function populateSchemaSelect() {
  const select = $("#assetSchemaSelect");
  if (!select) return;
  let schemas = mergedAssetSchemas(CONFIGURED_ASSET_SCHEMAS);
  try {
    if (typeof DataHiveAssets !== "undefined") {
      const data = await DataHiveAssets.schemas(currentAssetConnectorId());
      schemas = mergedAssetSchemas(data.items);
    }
  } catch {
    /* keep merged defaults */
  }
  fillAssetSchemaSelect(schemas);
}

const assetConnectorSelect = $("#assetConnectorSelect");
if (assetConnectorSelect) {
  assetConnectorSelect.addEventListener("change", async () => {
    assetState.connectorId = currentAssetConnectorId();
    assetState.schema = null;
    assetState.table = null;
    updateAssetConnectorHelp();
    const tableSelect = $("#assetTableSelect");
    if (tableSelect) {
      tableSelect.innerHTML = '<option value="">Select a schema first…</option>';
      tableSelect.disabled = true;
    }
    await loadAssetCatalog();
  });
}

const assetSchemaSelect = $("#assetSchemaSelect");
if (assetSchemaSelect) {
  assetSchemaSelect.addEventListener("change", (e) => {
    const schema = e.target.value;
    assetState.schema = schema || null;
    if (schema) populateTableSelect(schema);
    else {
      const tableSelect = $("#assetTableSelect");
      if (tableSelect) {
        tableSelect.innerHTML = '<option value="">Select a schema first…</option>';
        tableSelect.disabled = true;
      }
      const wrap = $("#assetStructureWrap");
      if (wrap) {
        wrap.innerHTML =
          '<div class="state">Pick a connector, then a schema and table — or choose an asset from the list.</div>';
      }
    }
  });
}

const assetTableSelect = $("#assetTableSelect");
if (assetTableSelect) {
  assetTableSelect.addEventListener("change", (e) => {
    const table = e.target.value;
    assetState.table = table || null;
    const opt = e.target.selectedOptions && e.target.selectedOptions[0];
    const cid =
      (opt && opt.getAttribute("data-connector-id")) || currentAssetConnectorId();
    onTableSelected(assetState.schema, table, cid);
  });
}

const assetBrowser = $("#assetBrowser");
if (assetBrowser) {
  assetBrowser.addEventListener("click", async (e) => {
    const row = e.target.closest(".ab-row");
    if (!row) return;
    const idx = Number(row.getAttribute("data-asset-idx"));
    const asset = assetState.catalogItems[idx];
    if (!asset) return;
    const schema = asset.schema || "";
    const table = asset.name || "";
    const cid = asset.connector_id || currentAssetConnectorId();
    if (cid && cid !== "all" && currentAssetConnectorId() === "all") {
      // Keep All connectors selected; structure uses asset's connector.
    }
    assetState.schema = schema || null;
    assetState.table = table || null;
    const schemaSel = $("#assetSchemaSelect");
    const tableSel = $("#assetTableSelect");
    if (schemaSel && schema) {
      if (![...schemaSel.options].some((o) => o.value === schema)) {
        schemaSel.insertAdjacentHTML(
          "beforeend",
          '<option value="' + escapeHtml(schema) + '">' + escapeHtml(schema) + "</option>"
        );
      }
      schemaSel.value = schema;
      await populateTableSelect(schema);
    }
    if (tableSel && table) {
      if (![...tableSel.options].some((o) => o.value === table)) {
        tableSel.insertAdjacentHTML(
          "beforeend",
          '<option value="' +
            escapeHtml(table) +
            '" data-connector-id="' +
            escapeHtml(cid) +
            '">' +
            escapeHtml(table) +
            "</option>"
        );
      }
      tableSel.value = table;
      tableSel.disabled = false;
    }
    await onTableSelected(schema, table, cid === "all" ? "local-postgres" : cid);
  });
}

async function initAssetsView() {
  if (assetState.loaded) {
    await refreshAssetsCatalog();
    return;
  }
  assetState.loaded = true;
  fillAssetSchemaSelect(mergedAssetSchemas([]));
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const nm = $("#userNm") ? $("#userNm").textContent.trim() : "Admin";
  const g = $("#assetsGreeting");
  if (g) g.textContent = greet + ", " + nm + "!";

  if (typeof checkConnectorApiHealth === "function") {
    const health = await checkConnectorApiHealth();
    if (health && health.postgres_ok === false && health.postgres_error) {
      const pgBanner = $("#pgBanner");
      if (pgBanner) {
        pgBanner.classList.remove("hidden");
        pgBanner.textContent =
          "PostgreSQL error: " + health.postgres_error +
          " — verify POSTGRES_* in .env and restart the API (python -m api)";
      }
    }
  }
  await refreshAssetsCatalog();
}

document.querySelectorAll("nav.rail a[data-view]").forEach((a) => {
  a.addEventListener("click", (e) => {
    e.preventDefault();
    const view = a.dataset.view;
    if (!view) return;
    document.querySelectorAll("nav.rail a[data-view]").forEach((x) => {
      x.classList.remove("active");
      x.removeAttribute("aria-current");
    });
    a.classList.add("active");
    a.setAttribute("aria-current", "page");
    $("#view-assets").classList.toggle("hidden", view !== "assets");
    $("#view-sql").classList.toggle("hidden", view !== "insights");
    $("#view-connectors").classList.toggle("hidden", view !== "connectors");
    const etlView = $("#view-etl");
    if (etlView) etlView.classList.toggle("hidden", view !== "etl");
    const glossaryView = $("#view-glossary");
    if (glossaryView) glossaryView.classList.toggle("hidden", view !== "glossary");
    const governanceView = $("#view-governance");
    if (governanceView) governanceView.classList.toggle("hidden", view !== "governance");
    const adminView = $("#view-admin");
    if (adminView) adminView.classList.toggle("hidden", view !== "admin");
    const reportingView = $("#view-reporting");
    if (reportingView) reportingView.classList.toggle("hidden", view !== "reporting");
    const askView = $("#view-ask");
    if (askView) askView.classList.toggle("hidden", view !== "ask");
    if (view === "assets") initAssetsView();
    if (view === "ask" && typeof DataHiveAsk !== "undefined") DataHiveAsk.init();
    if (view === "insights" && typeof DataHiveSqlExplorer !== "undefined") {
      DataHiveSqlExplorer.init();
    }
    if (view === "etl") initEtlView();
    if (view === "glossary") initGlossaryView();
    if (view === "governance") initGovernanceView();
    if (view === "admin") initAdminView();
    if (view === "reporting" && typeof DataHiveReporting !== "undefined") {
      DataHiveReporting.init();
    }
  });
});

let assetSearchTimer = null;
const assetSearchInput = $("#assetSearch");
if (assetSearchInput) {
  assetSearchInput.addEventListener("input", (e) => {
    const q = e.target.value.trim();
    clearTimeout(assetSearchTimer);
    const box = $("#assetSearchResults");
    if (!q) {
      box.classList.add("hidden");
      return;
    }
    assetSearchTimer = setTimeout(async () => {
      let items = [];
      try {
        if (typeof DataHiveAssets === "undefined") throw new Error("offline");
        items = (await DataHiveAssets.search(q, currentAssetConnectorId())).items || [];
      } catch {
        items = [];
      }
      box.innerHTML = "";
      if (!items.length) {
        box.innerHTML = '<div class="empty">No results for “' + escapeHtml(q) + '”.</div>';
      } else {
        items.forEach((it) => {
          const r = assetEl("div", "r");
          r.innerHTML =
            '<span class="tile" style="width:26px;height:26px;background:var(--navy-700);color:#fff;border-radius:6px;display:flex;align-items:center;justify-content:center">▦</span> ' +
            "<span>" + escapeHtml(it.name) + ' <small style="color:#8a93a3">· ' +
            escapeHtml(it.platform || it.type || "asset") +
            (it.connector_name ? " · " + escapeHtml(it.connector_name) : "") +
            (it.schema ? " · " + escapeHtml(it.schema) : "") + "</small></span>";
          if (it.schema && it.name) {
            r.style.cursor = "pointer";
            r.addEventListener("click", () => {
              box.classList.add("hidden");
              assetSearchInput.value = "";
              selectSchemaAndTable(it.schema, it.name, it.connector_id);
            });
          }
          box.appendChild(r);
        });
      }
      box.classList.remove("hidden");
    }, 250);
  });
}

async function selectSchemaAndTable(schema, table, connectorId) {
  if (connectorId && connectorId !== "all") {
    const connSel = $("#assetConnectorSelect");
    if (connSel && [...connSel.options].some((o) => o.value === connectorId)) {
      connSel.value = connectorId;
      assetState.connectorId = connectorId;
      await loadAssetCatalog();
    }
  }
  if (assetSchemaSelect) assetSchemaSelect.value = schema;
  assetState.schema = schema;
  await populateTableSelect(schema);
  if (assetTableSelect) assetTableSelect.value = table;
  assetState.table = table;
  onTableSelected(schema, table, connectorId || currentAssetConnectorId());
}

const assetDiscover = $("#assetDiscover");
if (assetDiscover) {
  assetDiscover.addEventListener("click", async (e) => {
    e.preventDefault();
    const connSel = $("#assetConnectorSelect");
    if (connSel) {
      connSel.value = "all";
      assetState.connectorId = "all";
    }
    if (assetSchemaSelect) assetSchemaSelect.value = "";
    assetState.schema = null;
    assetState.table = null;
    const tableSelect = $("#assetTableSelect");
    if (tableSelect) {
      tableSelect.innerHTML = '<option value="">Select a schema first…</option>';
      tableSelect.disabled = true;
    }
    const wrap = $("#assetStructureWrap");
    if (wrap) {
      wrap.innerHTML =
        '<div class="state">Pick a connector, then a schema and table — or choose an asset from the list.</div>';
    }
    refreshAssetsCatalog();
  });
}

document.addEventListener("click", (e) => {
  if (!e.target.closest(".searchwrap")) {
    const box = $("#assetSearchResults");
    if (box) box.classList.add("hidden");
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "/" && document.activeElement.tagName !== "INPUT" && document.activeElement.tagName !== "TEXTAREA") {
    const assetsVisible = $("#view-assets") && !$("#view-assets").classList.contains("hidden");
    if (assetsVisible && assetSearchInput) {
      e.preventDefault();
      assetSearchInput.focus();
    }
  }
});

(async function initConnectorApiBanner(){
  if (typeof ensureDataHiveConnectorApi === "function") {
    await ensureDataHiveConnectorApi();
  }
  if (typeof checkConnectorApiHealth !== "function") {
    await initAssetsView();
    return;
  }
  const health = await checkConnectorApiHealth();
  const banner = $("#apiBanner");
  if (health && health.ok) {
    banner.classList.add("hidden");
    if (Array.isArray(health.recent_connectors)) {
      renderRecentConnectionsFromItems(health.recent_connectors);
    } else {
      renderRecentConnections();
    }
  } else {
    const isMac =
      typeof navigator !== "undefined" &&
      /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent || "");
    const viaFile =
      typeof location !== "undefined" && String(location.protocol || "") === "file:";
    const startHint = isMac
      ? "double-click <code>scripts/Open DataHive UI.command</code> (opens " +
        "<code>http://127.0.0.1:5055/</code>), or run " +
        "<code>.venv/bin/python api/connector_watchdog.py</code>"
      : "open <code>scripts/Open DataHive UI.bat</code>, or run " +
        "<code>pythonw api/connector_watchdog.py</code>";
    banner.innerHTML =
      "Connector API is not reachable — connections will not be saved to MongoDB. " +
      (viaFile
        ? "You opened this page as <code>file://</code>, which blocks API calls. "
        : "") +
      "Start the API via " +
      startHint +
      (health && health.detail ? " (" + escapeHtml(health.detail) + ")" : "");
    banner.classList.remove("hidden");
    renderRecentConnections();
  }
  await initAssetsView();
})();

/* ========== Admin: User Groups / Personas / Users ========== */
const ADMIN_STORAGE_KEY = "datahive.admin.v1";
const ADMIN_ROLES = ["viewer", "editor", "admin"];

const ADMIN_SEED = {
  groups: [
    { id: "g-analytics", name: "Analytics", description: "Data analysts and reporting teams", personaId: "p-analyst" },
    { id: "g-marketing", name: "Marketing", description: "Campaign and growth users", personaId: "p-marketing" },
  ],
  personas: [
    { id: "p-analyst", name: "Data Analyst", description: "Surfaces dashboards, queries, and verified metrics" },
    { id: "p-marketing", name: "Marketing", description: "Surfaces campaign assets and acquisition metrics" },
  ],
  users: [
    { id: "u-admin", username: "admin", displayName: "Admin", email: "admin@acldigital.com", role: "admin", groupId: "g-analytics", personaId: "p-analyst" },
    { id: "u-mmadden", username: "mmadden", displayName: "Matt Madden", email: "mmadden@acldigital.com", role: "editor", groupId: "g-marketing", personaId: "p-marketing" },
  ],
};

let adminState = null;
let adminActiveTab = "groups";
let adminEdit = null; // { kind, id } or null for add
const adminSearch = { groups: "", personas: "", users: "" };

function adminUid(prefix) {
  return prefix + "-" + Math.random().toString(36).slice(2, 9);
}

function adminMatches(query, parts) {
  const q = (query || "").trim().toLowerCase();
  if (!q) return true;
  return parts.some((p) => String(p || "").toLowerCase().includes(q));
}

function getDataHiveUserRole() {
  try {
    if (!adminState) loadAdminState();
  } catch (_e) {
    /* ignore */
  }
  const nm = ($("#userNm") && $("#userNm").textContent.trim()) || "Admin";
  const users = (adminState && adminState.users) || [];
  const match = users.find(
    (u) =>
      String(u.displayName || "").toLowerCase() === nm.toLowerCase() ||
      String(u.username || "").toLowerCase() === nm.toLowerCase()
  );
  if (match && match.role) return String(match.role).toLowerCase();
  if (nm.toLowerCase() === "admin" || nm.toLowerCase() === "administrator") return "admin";
  return "editor";
}
window.getDataHiveUserRole = getDataHiveUserRole;

function loadAdminState() {
  try {
    const raw = localStorage.getItem(ADMIN_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.groups) && Array.isArray(parsed.personas) && Array.isArray(parsed.users)) {
        return parsed;
      }
    }
  } catch (_) { /* ignore corrupt storage */ }
  return JSON.parse(JSON.stringify(ADMIN_SEED));
}

function saveAdminState() {
  localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(adminState));
}

function groupNameById(id) {
  const g = adminState.groups.find((x) => x.id === id);
  return g ? g.name : "—";
}

function personaNameById(id) {
  const p = adminState.personas.find((x) => x.id === id);
  return p ? p.name : "—";
}

function usersInGroup(groupId) {
  return adminState.users.filter((u) => u.groupId === groupId).length;
}

function setAdminTab(tab) {
  adminActiveTab = tab;
  document.querySelectorAll(".admin-tab").forEach((btn) => {
    const on = btn.dataset.adminTab === tab;
    btn.classList.toggle("active", on);
    btn.setAttribute("aria-selected", on ? "true" : "false");
  });
  document.querySelectorAll("[data-admin-section]").forEach((sec) => {
    sec.classList.toggle("hidden", sec.dataset.adminSection !== tab);
  });
  const searchIds = { groups: "adminSearchGroups", personas: "adminSearchPersonas", users: "adminSearchUsers" };
  const input = searchIds[tab] ? $("#" + searchIds[tab]) : null;
  if (input) setTimeout(() => input.focus(), 30);
}

function renderAdminGroups() {
  const body = $("#adminGroupsBody");
  const count = $("#adminGroupsCount");
  const filtered = adminState.groups.filter((g) =>
    adminMatches(adminSearch.groups, [g.name, g.description, personaNameById(g.personaId)])
  );
  if (count) {
    count.textContent = adminSearch.groups.trim()
      ? filtered.length + "/" + adminState.groups.length
      : String(adminState.groups.length);
  }
  if (!body) return;
  if (!adminState.groups.length) {
    body.innerHTML = '<div class="admin-empty">No user groups yet. Click "Add group" to create one.</div>';
    return;
  }
  if (!filtered.length) {
    body.innerHTML = '<div class="admin-empty">No user groups match "' + escapeHtml(adminSearch.groups.trim()) + '".</div>';
    return;
  }
  body.innerHTML =
    '<table class="admin-table" aria-label="User Groups">' +
    "<thead><tr><th>Name</th><th>Description</th><th>Default persona</th><th>Users</th><th></th></tr></thead><tbody>" +
    filtered.map((g) =>
      "<tr>" +
      '<td class="nm">' + escapeHtml(g.name) + "</td>" +
      "<td>" + escapeHtml(g.description || "—") + "</td>" +
      "<td>" + escapeHtml(personaNameById(g.personaId)) + "</td>" +
      "<td>" + usersInGroup(g.id) + "</td>" +
      '<td><div class="admin-actions">' +
      '<button type="button" class="btn-sm" data-admin-edit="groups" data-id="' + escapeHtml(g.id) + '">Modify</button>' +
      '<button type="button" class="btn-sm danger" data-admin-del="groups" data-id="' + escapeHtml(g.id) + '">Delete</button>' +
      "</div></td></tr>"
    ).join("") +
    "</tbody></table>";
}

function renderAdminPersonas() {
  const body = $("#adminPersonasBody");
  const count = $("#adminPersonasCount");
  const filtered = adminState.personas.filter((p) =>
    adminMatches(adminSearch.personas, [p.name, p.description])
  );
  if (count) {
    count.textContent = adminSearch.personas.trim()
      ? filtered.length + "/" + adminState.personas.length
      : String(adminState.personas.length);
  }
  if (!body) return;
  if (!adminState.personas.length) {
    body.innerHTML = '<div class="admin-empty">No personas yet. Click "Add persona" to create one.</div>';
    return;
  }
  if (!filtered.length) {
    body.innerHTML = '<div class="admin-empty">No personas match "' + escapeHtml(adminSearch.personas.trim()) + '".</div>';
    return;
  }
  body.innerHTML =
    '<table class="admin-table" aria-label="Personas">' +
    "<thead><tr><th>Name</th><th>Description</th><th>Used by</th><th></th></tr></thead><tbody>" +
    filtered.map((p) => {
      const used = adminState.users.filter((u) => u.personaId === p.id).length +
        adminState.groups.filter((g) => g.personaId === p.id).length;
      return (
        "<tr>" +
        '<td class="nm">' + escapeHtml(p.name) + "</td>" +
        "<td>" + escapeHtml(p.description || "—") + "</td>" +
        "<td>" + used + " assignment" + (used === 1 ? "" : "s") + "</td>" +
        '<td><div class="admin-actions">' +
        '<button type="button" class="btn-sm" data-admin-edit="personas" data-id="' + escapeHtml(p.id) + '">Modify</button>' +
        '<button type="button" class="btn-sm danger" data-admin-del="personas" data-id="' + escapeHtml(p.id) + '">Delete</button>' +
        "</div></td></tr>"
      );
    }).join("") +
    "</tbody></table>";
}

function renderAdminUsers() {
  const body = $("#adminUsersBody");
  const count = $("#adminUsersCount");
  const filtered = adminState.users.filter((u) =>
    adminMatches(adminSearch.users, [
      u.displayName, u.username, u.email, u.role,
      groupNameById(u.groupId), personaNameById(u.personaId),
    ])
  );
  if (count) {
    count.textContent = adminSearch.users.trim()
      ? filtered.length + "/" + adminState.users.length
      : String(adminState.users.length);
  }
  if (!body) return;
  if (!adminState.users.length) {
    body.innerHTML = '<div class="admin-empty">No users yet. Click "Add user" to create one.</div>';
    return;
  }
  if (!filtered.length) {
    body.innerHTML = '<div class="admin-empty">No users match "' + escapeHtml(adminSearch.users.trim()) + '".</div>';
    return;
  }
  body.innerHTML =
    '<table class="admin-table" aria-label="Users">' +
    "<thead><tr><th>User</th><th>Email</th><th>Role</th><th>Group</th><th>Persona</th><th></th></tr></thead><tbody>" +
    filtered.map((u) =>
      "<tr>" +
      '<td><div class="nm">' + escapeHtml(u.displayName) + '</div><div class="muted">@' + escapeHtml(u.username) + "</div></td>" +
      "<td>" + escapeHtml(u.email || "—") + "</td>" +
      '<td><span class="role-pill ' + escapeHtml(u.role) + '">' + escapeHtml(u.role) + "</span></td>" +
      "<td>" + escapeHtml(groupNameById(u.groupId)) + "</td>" +
      "<td>" + escapeHtml(personaNameById(u.personaId)) + "</td>" +
      '<td><div class="admin-actions">' +
      '<button type="button" class="btn-sm" data-admin-edit="users" data-id="' + escapeHtml(u.id) + '">Modify</button>' +
      '<button type="button" class="btn-sm danger" data-admin-del="users" data-id="' + escapeHtml(u.id) + '">Delete</button>' +
      "</div></td></tr>"
    ).join("") +
    "</tbody></table>";
}

function renderAdminAll() {
  renderAdminGroups();
  renderAdminPersonas();
  renderAdminUsers();
}

function optionHtml(items, selectedId, emptyLabel) {
  return (
    '<option value="">' + escapeHtml(emptyLabel) + "</option>" +
    items.map((it) =>
      '<option value="' + escapeHtml(it.id) + '"' +
      (it.id === selectedId ? " selected" : "") + ">" +
      escapeHtml(it.name) + "</option>"
    ).join("")
  );
}

function openAdminModal(kind, id) {
  adminEdit = id ? { kind, id } : { kind, id: null };
  const isEdit = !!id;
  const titles = {
    groups: isEdit ? "Modify user group" : "Add user group",
    personas: isEdit ? "Modify persona" : "Add persona",
    users: isEdit ? "Modify user" : "Add user",
  };
  $("#adminModalTitle").textContent = titles[kind] || "Edit";
  $("#adminFormError").classList.add("hidden");
  $("#adminFormError").textContent = "";

  const fields = $("#adminFormFields");
  if (kind === "groups") {
    const g = isEdit ? adminState.groups.find((x) => x.id === id) : null;
    fields.innerHTML =
      '<div class="field"><label for="af_name">Name <span class="req">*</span></label>' +
      '<input id="af_name" name="name" required maxlength="64" value="' + escapeHtml((g && g.name) || "") + '" /></div>' +
      '<div class="field"><label for="af_description">Description</label>' +
      '<input id="af_description" name="description" maxlength="256" value="' + escapeHtml((g && g.description) || "") + '" /></div>' +
      '<div class="field"><label for="af_personaId">Default persona</label>' +
      '<select id="af_personaId" name="personaId">' +
      optionHtml(adminState.personas, g && g.personaId, "None") +
      "</select></div>";
  } else if (kind === "personas") {
    const p = isEdit ? adminState.personas.find((x) => x.id === id) : null;
    fields.innerHTML =
      '<div class="field"><label for="af_name">Name <span class="req">*</span></label>' +
      '<input id="af_name" name="name" required maxlength="64" value="' + escapeHtml((p && p.name) || "") + '" /></div>' +
      '<div class="field"><label for="af_description">Description</label>' +
      '<textarea id="af_description" name="description" maxlength="512">' + escapeHtml((p && p.description) || "") + "</textarea></div>";
  } else if (kind === "users") {
    const u = isEdit ? adminState.users.find((x) => x.id === id) : null;
    fields.innerHTML =
      '<div class="row2">' +
      '<div class="field"><label for="af_username">Username <span class="req">*</span></label>' +
      '<input id="af_username" name="username" required maxlength="64" autocomplete="off" value="' +
      escapeHtml((u && u.username) || "") + '"' + (isEdit ? " readonly" : "") + " /></div>" +
      '<div class="field"><label for="af_displayName">Display name <span class="req">*</span></label>' +
      '<input id="af_displayName" name="displayName" required maxlength="128" value="' +
      escapeHtml((u && u.displayName) || "") + '" /></div></div>' +
      '<div class="field"><label for="af_email">Email <span class="req">*</span></label>' +
      '<input id="af_email" name="email" type="email" required maxlength="256" value="' +
      escapeHtml((u && u.email) || "") + '" /></div>' +
      '<div class="row3">' +
      '<div class="field"><label for="af_role">Role <span class="req">*</span></label>' +
      '<select id="af_role" name="role">' +
      ADMIN_ROLES.map((r) =>
        '<option value="' + r + '"' + ((u ? u.role : "viewer") === r ? " selected" : "") + ">" + r + "</option>"
      ).join("") +
      "</select></div>" +
      '<div class="field"><label for="af_groupId">User group</label>' +
      '<select id="af_groupId" name="groupId">' +
      optionHtml(adminState.groups, u && u.groupId, "None") +
      "</select></div>" +
      '<div class="field"><label for="af_personaId">Persona</label>' +
      '<select id="af_personaId" name="personaId">' +
      optionHtml(adminState.personas, u && u.personaId, "None") +
      "</select></div></div>";
  }

  $("#adminModalOverlay").classList.remove("hidden");
  const first = $("#af_name") || $("#af_username") || $("#af_displayName");
  if (first) setTimeout(() => first.focus(), 30);
}

function closeAdminModal() {
  $("#adminModalOverlay").classList.add("hidden");
  adminEdit = null;
}

function showAdminFormError(msg) {
  const el = $("#adminFormError");
  el.textContent = msg;
  el.classList.remove("hidden");
}

function saveAdminForm(e) {
  e.preventDefault();
  if (!adminEdit) return;
  const kind = adminEdit.kind;
  const id = adminEdit.id;

  if (kind === "groups") {
    const name = ($("#af_name").value || "").trim();
    const description = ($("#af_description").value || "").trim();
    const personaId = $("#af_personaId").value || "";
    if (!name) return showAdminFormError("Name is required.");
    const dup = adminState.groups.some((g) => g.name.toLowerCase() === name.toLowerCase() && g.id !== id);
    if (dup) return showAdminFormError("A group with this name already exists.");
    if (id) {
      const g = adminState.groups.find((x) => x.id === id);
      if (!g) return showAdminFormError("Group not found.");
      g.name = name; g.description = description; g.personaId = personaId;
    } else {
      adminState.groups.push({ id: adminUid("g"), name, description, personaId });
    }
  } else if (kind === "personas") {
    const name = ($("#af_name").value || "").trim();
    const description = ($("#af_description").value || "").trim();
    if (!name) return showAdminFormError("Name is required.");
    const dup = adminState.personas.some((p) => p.name.toLowerCase() === name.toLowerCase() && p.id !== id);
    if (dup) return showAdminFormError("A persona with this name already exists.");
    if (id) {
      const p = adminState.personas.find((x) => x.id === id);
      if (!p) return showAdminFormError("Persona not found.");
      p.name = name; p.description = description;
    } else {
      adminState.personas.push({ id: adminUid("p"), name, description });
    }
  } else if (kind === "users") {
    const username = ($("#af_username").value || "").trim().toLowerCase();
    const displayName = ($("#af_displayName").value || "").trim();
    const email = ($("#af_email").value || "").trim();
    const role = $("#af_role").value || "viewer";
    const groupId = $("#af_groupId").value || "";
    const personaId = $("#af_personaId").value || "";
    if (!username) return showAdminFormError("Username is required.");
    if (!/^[a-z0-9._-]{2,64}$/.test(username)) {
      return showAdminFormError("Username must be 2–64 chars: letters, numbers, . _ -");
    }
    if (!displayName) return showAdminFormError("Display name is required.");
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return showAdminFormError("A valid email is required.");
    }
    if (!ADMIN_ROLES.includes(role)) return showAdminFormError("Invalid role.");
    const dup = adminState.users.some((u) => u.username === username && u.id !== id);
    if (dup) return showAdminFormError("A user with this username already exists.");
    if (id) {
      const u = adminState.users.find((x) => x.id === id);
      if (!u) return showAdminFormError("User not found.");
      u.displayName = displayName; u.email = email; u.role = role;
      u.groupId = groupId; u.personaId = personaId;
    } else {
      adminState.users.push({
        id: adminUid("u"), username, displayName, email, role, groupId, personaId,
      });
    }
  }

  saveAdminState();
  renderAdminAll();
  closeAdminModal();
}

function deleteAdminItem(kind, id) {
  let name = id;
  if (kind === "groups") {
    const g = adminState.groups.find((x) => x.id === id);
    name = g ? g.name : id;
    const linked = usersInGroup(id);
    const msg = linked
      ? 'Delete user group "' + name + '"? ' + linked + " user(s) will be unassigned from this group."
      : 'Delete user group "' + name + '"?';
    if (!confirm(msg)) return;
    adminState.groups = adminState.groups.filter((x) => x.id !== id);
    adminState.users.forEach((u) => { if (u.groupId === id) u.groupId = ""; });
  } else if (kind === "personas") {
    const p = adminState.personas.find((x) => x.id === id);
    name = p ? p.name : id;
    if (!confirm('Delete persona "' + name + '"? Users and groups using it will be cleared.')) return;
    adminState.personas = adminState.personas.filter((x) => x.id !== id);
    adminState.groups.forEach((g) => { if (g.personaId === id) g.personaId = ""; });
    adminState.users.forEach((u) => { if (u.personaId === id) u.personaId = ""; });
  } else if (kind === "users") {
    const u = adminState.users.find((x) => x.id === id);
    name = u ? u.displayName : id;
    if (!confirm('Delete user "' + name + '"?')) return;
    adminState.users = adminState.users.filter((x) => x.id !== id);
  } else {
    return;
  }
  saveAdminState();
  renderAdminAll();
}

let adminBound = false;
function bindAdminEvents() {
  if (adminBound) return;
  adminBound = true;

  document.querySelectorAll(".admin-tab").forEach((btn) => {
    btn.addEventListener("click", () => setAdminTab(btn.dataset.adminTab));
  });

  $("#adminAddGroupBtn").addEventListener("click", () => openAdminModal("groups", null));
  $("#adminAddPersonaBtn").addEventListener("click", () => openAdminModal("personas", null));
  $("#adminAddUserBtn").addEventListener("click", () => openAdminModal("users", null));

  const searchBindings = [
    ["adminSearchGroups", "groups", renderAdminGroups],
    ["adminSearchPersonas", "personas", renderAdminPersonas],
    ["adminSearchUsers", "users", renderAdminUsers],
  ];
  searchBindings.forEach(([id, key, render]) => {
    const input = $("#" + id);
    if (!input) return;
    input.addEventListener("input", () => {
      adminSearch[key] = input.value;
      render();
    });
  });

  $("#adminModalClose").addEventListener("click", closeAdminModal);
  $("#adminFormCancel").addEventListener("click", closeAdminModal);
  $("#adminForm").addEventListener("submit", saveAdminForm);

  const overlay = $("#adminModalOverlay");
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeAdminModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !overlay.classList.contains("hidden")) closeAdminModal();
  });

  $("#view-admin").addEventListener("click", (e) => {
    const editBtn = e.target.closest("[data-admin-edit]");
    if (editBtn) {
      openAdminModal(editBtn.dataset.adminEdit, editBtn.dataset.id);
      return;
    }
    const delBtn = e.target.closest("[data-admin-del]");
    if (delBtn) {
      deleteAdminItem(delBtn.dataset.adminDel, delBtn.dataset.id);
    }
  });
}

function initAdminView() {
  if (!adminState) adminState = loadAdminState();
  bindAdminEvents();
  setAdminTab(adminActiveTab || "groups");
  renderAdminAll();
}

/* ========== ETL / ELT pipelines ========== */
const ETL_STORAGE_KEY = "datahive.etl.pipelines.v1";
let etlConnections = [];
let etlPipelines = [];
let etlBound = false;
let etlGeneratedScript = "";
let etlLocalUpload = null; // { file_name, source_object, absolute_path, ext, file_size }

function etlConnectorOptions() {
  const clouds = Object.values(CLOUDS).filter((c) => c.mode !== "upload");
  // Always offer Local Postgres as a warehouse endpoint for ELT.
  if (!clouds.some((c) => c.id === "postgres")) {
    clouds.push({
      id: "postgres",
      name: "PostgreSQL",
      short: "Postgres",
      type: "database",
      mode: "local",
    });
  }
  // Local file upload appears via Source kind; also list it as a source connector.
  if (!clouds.some((c) => c.id === "upload") && CLOUDS.upload) {
    clouds.push(CLOUDS.upload);
  }
  return clouds;
}

function etlApiBaseUrl() {
  if (typeof connectorApiBaseUrl === "function") return connectorApiBaseUrl();
  if (typeof glossaryApiBase === "function") return glossaryApiBase();
  const host = location.hostname || "127.0.0.1";
  return "http://" + host + ":5055";
}

function clearEtlLocalUpload() {
  etlLocalUpload = null;
  const input = $("#etlUploadFileInput");
  if (input) input.value = "";
  const selected = $("#etlUploadSelected");
  const zone = $("#etlUploadDropzone");
  if (selected) selected.classList.add("hidden");
  if (zone) zone.classList.remove("hidden");
  if ($("#etlUploadSelectedName")) $("#etlUploadSelectedName").textContent = "";
  if ($("#etlUploadSelectedSize")) $("#etlUploadSelectedSize").textContent = "";
}

function showEtlLocalUploadSelected(meta) {
  etlLocalUpload = meta;
  if ($("#etlUploadSelectedName")) $("#etlUploadSelectedName").textContent = meta.file_name || meta.source_object || "file";
  if ($("#etlUploadSelectedSize")) {
    $("#etlUploadSelectedSize").textContent =
      (meta.file_size != null ? formatBytes(meta.file_size) + " · " : "") +
      (meta.source_object || "");
  }
  if ($("#etlUploadSelected")) $("#etlUploadSelected").classList.remove("hidden");
  if ($("#etlUploadDropzone")) $("#etlUploadDropzone").classList.add("hidden");
  if ($("#etl_source_object")) $("#etl_source_object").value = meta.source_object || meta.absolute_path || "";
  if ($("#etl_target_object") && !$("#etl_target_object").value.trim()) {
    const stem = etlSuggestTableFromFile(meta.file_name || "file");
    const tgtType = ($("#etl_target_type") && $("#etl_target_type").value) || "";
    if (tgtType === "snowflake") {
      $("#etl_target_object").value = "SALES_DB.RAW." + stem;
    } else if (tgtType === "gcp") {
      const project = etlGcpProjectHint(
        ($("#etl_target_conn") && $("#etl_target_conn").value) || ""
      );
      $("#etl_target_object").value =
        project + ".raw_dataset." + stem.toLowerCase();
      if ($("#etl_target_kind")) {
        rebuildEtlKindSelect($("#etl_target_kind"), "gcp", "target", "bigquery_table");
        updateEtlTargetKindUi("bigquery_table");
      }
    } else {
      $("#etl_target_object").value = stem.toLowerCase();
    }
  }
  if ($("#etl_name") && !$("#etl_name").value.trim()) {
    $("#etl_name").value =
      "local_" + etlSuggestTableFromFile(meta.file_name || "file").toLowerCase() + "_ingest";
  }
}

function selectedEtlLanguage() {
  const sel = $("#etl_language");
  return (sel && sel.value) || "sql";
}

function etlPlatformLabel(cloudId) {
  const c = CLOUDS[cloudId] || etlConnectorOptions().find((x) => x.id === cloudId);
  return (c && (c.short || c.name)) || cloudId || "source";
}

function etlQuoteIdent(name, dialect) {
  const parts = String(name || "")
    .split(".")
    .map((p) => p.trim())
    .filter(Boolean);
  if (!parts.length) return dialect === "snowflake" ? "SOURCE_TABLE" : "source_table";
  if (dialect === "bigquery") {
    return parts.map((p) => "`" + p.replace(/`/g, "") + "`").join(".");
  }
  if (dialect === "snowflake") {
    return parts.map((p) => '"' + p.replace(/"/g, '""').toUpperCase() + '"').join(".");
  }
  return parts.map((p) => '"' + p.replace(/"/g, '""') + '"').join(".");
}

function etlGcpProjectHint(connKey) {
  const conn = findEtlConnection(connKey || "");
  const project =
    (conn && (conn.account_id || conn.dataset_scope || "")) ||
    "my-project";
  // dataset_scope may be "project" or "project.dataset" or a list — take first token.
  const token = String(project).split(/[,\s;/]+/)[0] || "my-project";
  const projectId = token.includes(".") ? token.split(".")[0] : token;
  return projectId || "my-project";
}

/** Platform-aware object kinds for Source / Destination selectors. */
function etlObjectKindsForPlatform(cloudId, role) {
  const isSource = role !== "target";
  if (cloudId === "gcp") {
    const kinds = [
      { value: "bigquery_table", label: "BigQuery table" },
      { value: "gcs_uri", label: "GCS files (bucket / URI)" },
    ];
    if (isSource) kinds.push({ value: "local_file", label: "Local file upload" });
    return kinds;
  }
  if (cloudId === "aws") {
    const kinds = [
      { value: "s3_uri", label: "S3 URI" },
      { value: "object", label: "Table / object" },
    ];
    if (isSource) kinds.push({ value: "local_file", label: "Local file upload" });
    return kinds;
  }
  if (cloudId === "azure") {
    const kinds = [
      { value: "adls_uri", label: "ADLS / ABFSS URI" },
      { value: "object", label: "Table / object" },
    ];
    if (isSource) kinds.push({ value: "local_file", label: "Local file upload" });
    return kinds;
  }
  if (cloudId === "snowflake") {
    const kinds = [
      { value: "object", label: "Table / view" },
      { value: "stage_file", label: "Snowflake stage file" },
    ];
    if (isSource) kinds.push({ value: "local_file", label: "Local file upload" });
    return kinds;
  }
  if (cloudId === "upload") {
    return isSource
      ? [{ value: "local_file", label: "Local file upload" }]
      : [{ value: "object", label: "Table / object / URI" }];
  }
  const kinds = [{ value: "object", label: "Table / object / URI" }];
  if (isSource) kinds.push({ value: "local_file", label: "Local file upload" });
  return kinds;
}

function etlDefaultObject(kind, cloudId, objectKind) {
  const role = kind === "source" ? "source" : "target";
  const okind =
    objectKind ||
    (cloudId === "gcp"
      ? "bigquery_table"
      : cloudId === "aws"
        ? "s3_uri"
        : cloudId === "azure"
          ? "adls_uri"
          : "object");

  if (okind === "bigquery_table") {
    const project = etlGcpProjectHint(
      role === "source"
        ? ($("#etl_source_conn") && $("#etl_source_conn").value) || ""
        : ($("#etl_target_conn") && $("#etl_target_conn").value) || ""
    );
    return role === "source"
      ? project + ".raw_dataset.source_table"
      : project + ".curated_dataset.target_table";
  }
  if (okind === "gcs_uri") {
    return role === "source"
      ? "gs://my-bucket/folder/data.json"
      : "gs://my-bucket/curated/output/";
  }
  if (okind === "s3_uri") {
    return role === "source"
      ? "s3://my-bucket/raw/customers/"
      : "s3://my-bucket/curated/customers/";
  }
  if (okind === "adls_uri") {
    return role === "source"
      ? "abfss://container@account.dfs.core.windows.net/raw/customers/"
      : "abfss://container@account.dfs.core.windows.net/curated/customers/";
  }
  if (kind === "source") {
    if (cloudId === "snowflake") return "RAW.BRONZE.CUSTOMERS";
    return "dhpoc-bronze.test_customer_tbl";
  }
  if (cloudId === "snowflake") return "ANALYTICS.SILVER.CUSTOMERS";
  if (cloudId === "gcp") return "my-project.curated_dataset.target_table";
  return "dhpoc-silver.dh_customer";
}

function rebuildEtlKindSelect(selectEl, cloudId, role, preferred) {
  if (!selectEl) return;
  const kinds = etlObjectKindsForPlatform(cloudId, role);
  // Pass preferred="" to force the platform default; omit to keep the current value.
  const prev = preferred !== undefined && preferred !== null ? preferred : selectEl.value;
  selectEl.innerHTML = kinds
    .map(
      (k) =>
        '<option value="' +
        escapeHtml(k.value) +
        '">' +
        escapeHtml(k.label) +
        "</option>"
    )
    .join("");
  if (prev && kinds.some((k) => k.value === prev)) {
    selectEl.value = prev;
  } else if (kinds.length) {
    selectEl.value = kinds[0].value;
  }
}

function etlIsGcsUri(uri) {
  return /^gs:\/\//i.test(String(uri || "").trim());
}

function etlUriFileExt(uri) {
  const path = String(uri || "").split("?")[0];
  const base = path.split("/").pop() || "";
  if (!base || base.endsWith("/")) return "";
  const cleaned = base.replace(/\.(gz|zip)$/i, "");
  const m = cleaned.match(/\.([A-Za-z0-9]+)$/);
  return m ? m[1].toLowerCase() : "";
}

function etlIsGcsJsonSource(ctx) {
  const src = String((ctx && ctx.sourceObject) || "").trim();
  if (!etlIsGcsUri(src)) return false;
  const ext = etlUriFileExt(src);
  // Explicit JSON/JSONL file, or a folder prefix (ends with /) treated as JSON landing
  return !ext || etlIsJsonFileExt(ext);
}

function etlIsLocalUploadSource(ctx) {
  return (
    (ctx && ctx.sourceKind === "local_file") ||
    (ctx && ctx.isLocalUpload) ||
    /^UPLOAD\//i.test(String((ctx && ctx.sourceObject) || ""))
  );
}

function etlSqlDialect(cloudId) {
  if (cloudId === "snowflake") return "snowflake";
  if (cloudId === "gcp") return "bigquery";
  if (cloudId === "azure") return "tsql";
  return "postgres";
}

function etlSuggestTableFromFile(path) {
  let base = String(path || "STAGE_FILE").split("/").pop() || "STAGE_FILE";
  base = base.replace(/\.(csv|tsv|json|jsonl|parquet|gz|zip)(\.(gz|zip))?$/i, "");
  base = base.replace(/\.(csv|tsv|json|jsonl|parquet)$/i, "");
  let safe = base.replace(/[^A-Za-z0-9_]+/g, "_").replace(/^_+|_+$/g, "");
  if (!safe) safe = "STAGE_FILE";
  if (/^\d/.test(safe)) safe = "T_" + safe;
  return safe.toUpperCase();
}

function etlFileFormatSpec(ext) {
  const e = String(ext || "").toLowerCase().replace(/^\./, "");
  if (e === "parquet") {
    return {
      name: "DH_PARQUET_FF",
      ddl: "TYPE = PARQUET",
      copyOptions: "MATCH_BY_COLUMN_NAME = CASE_INSENSITIVE",
    };
  }
  if (e === "json" || e === "jsonl" || e === "ndjson") {
    return {
      name: "DH_JSON_FF",
      ddl: "TYPE = JSON STRIP_OUTER_ARRAY = TRUE",
      copyOptions: "",
    };
  }
  if (e === "tsv") {
    return {
      name: "DH_TSV_HDR_FF",
      // PARSE_HEADER (not SKIP_HEADER) is required for INFER_SCHEMA to use header names.
      ddl: "TYPE = CSV FIELD_DELIMITER = '\\t' PARSE_HEADER = TRUE FIELD_OPTIONALLY_ENCLOSED_BY = '\"' NULL_IF = ('', 'NULL') ERROR_ON_COLUMN_COUNT_MISMATCH = FALSE",
      copyOptions: "MATCH_BY_COLUMN_NAME = CASE_INSENSITIVE",
    };
  }
  return {
    name: "DH_CSV_HDR_FF",
    // PARSE_HEADER (not SKIP_HEADER) is required for INFER_SCHEMA to use header names.
    // SKIP_HEADER alone yields generic C1/C2/C3 columns.
    ddl: "TYPE = CSV FIELD_DELIMITER = ',' PARSE_HEADER = TRUE FIELD_OPTIONALLY_ENCLOSED_BY = '\"' NULL_IF = ('', 'NULL') ERROR_ON_COLUMN_COUNT_MISMATCH = FALSE",
    copyOptions: "MATCH_BY_COLUMN_NAME = CASE_INSENSITIVE",
  };
}

function etlIsJsonFileExt(ext) {
  const e = String(ext || "")
    .toLowerCase()
    .replace(/^\./, "");
  return e === "json" || e === "jsonl" || e === "ndjson";
}

function etlStageResolveExt(ctx) {
  const filePath = ctx.stageFilePath || String(ctx.sourceObject || "").replace(/^@[^/]+\//, "");
  const fromCtx = String(ctx.stageFileExt || "").toLowerCase().replace(/^\./, "");
  if (fromCtx) return fromCtx;
  const base = String(filePath || "").split("/").pop() || "";
  const cleaned = base.replace(/\.(gz|zip)$/i, "");
  const m = cleaned.match(/\.([A-Za-z0-9]+)$/);
  return m ? m[1].toLowerCase() : "csv";
}

function etlStageTargetParts(ctx) {
  const stageFqn = (ctx.stageFqn || "SALES_DB.RAW.RAW_STAGE").replace(/^@/, "");
  const filePath = ctx.stageFilePath || String(ctx.sourceObject || "").replace(/^@[^/]+\//, "");
  const location = "@" + stageFqn + "/" + String(filePath).replace(/^\//, "");
  const target = ctx.targetObject || "SALES_DB.RAW." + etlSuggestTableFromFile(filePath);
  const parts = String(target).split(".");
  const database = parts.length >= 3 ? parts[0] : "SALES_DB";
  const schema = parts.length >= 2 ? parts[parts.length - 2] : "RAW";
  const table = parts[parts.length - 1] || etlSuggestTableFromFile(filePath);
  const fqTable = database + "." + schema + "." + table;
  const ext = etlStageResolveExt(ctx);
  const ff = etlFileFormatSpec(ext);
  return {
    stageFqn,
    filePath,
    location,
    database,
    schema,
    table,
    fqTable,
    ext,
    ff,
    sourceFileSql: String(filePath).replace(/'/g, "''"),
  };
}

function generateSnowflakeJsonFlattenSql(ctx) {
  const p = etlStageTargetParts(ctx);
  const landing = p.fqTable + "_LANDING";
  const flat = p.fqTable + "_FLAT";
  const ffFqn = p.database + "." + p.schema + "." + p.ff.name;

  return [
    "-- DataHive generated Snowflake ELT",
    "-- Pipeline : " + ctx.name,
    "-- Pattern  : Nested JSON → flatten → tabular RAW",
    "-- Source   : " + p.location,
    "-- Target   : " + p.fqTable + " (wide) + " + flat + " (long)",
    "-- Notes    : " + (ctx.notes || "n/a"),
    "--",
    "-- Steps:",
    "--   1) Land each JSON document as VARIANT",
    "--   2) Recursively FLATTEN nested objects/arrays to leaf scalars",
    "--   3) Aggregate array leaves, then PIVOT into a wide tabular table",
    "",
    "USE WAREHOUSE DEV_WH;",
    "USE DATABASE " + p.database + ";",
    "USE SCHEMA " + p.schema + ";",
    "",
    "-- 1) JSON file format (outer array → one row per document)",
    "CREATE OR REPLACE FILE FORMAT " + ffFqn,
    "  " + p.ff.ddl + ";",
    "",
    "-- 2) VARIANT landing (preserves full nested document)",
    "CREATE OR REPLACE TABLE " + landing + " (",
    "  doc VARIANT,",
    "  _dh_ingested_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),",
    "  _dh_source_file VARCHAR",
    ");",
    "",
    "COPY INTO " + landing + " (doc)",
    "  FROM '" + p.location + "'",
    "  FILE_FORMAT = (FORMAT_NAME = '" + ffFqn + "')",
    "  ON_ERROR = 'ABORT_STATEMENT';",
    "",
    "UPDATE " + landing,
    "SET _dh_ingested_at = COALESCE(_dh_ingested_at, CURRENT_TIMESTAMP()),",
    "    _dh_source_file = COALESCE(_dh_source_file, '" + p.sourceFileSql + "')",
    "WHERE _dh_ingested_at IS NULL OR _dh_source_file IS NULL;",
    "",
    "-- 3) Long tabular form — one row per scalar leaf (nested paths flattened)",
    "--    Array indices are stripped so citations[0], citations[1] → column CITATIONS",
    "CREATE OR REPLACE TABLE " + flat + " AS",
    "SELECT *",
    "FROM (",
    "  SELECT",
    "    f.seq AS _dh_doc_seq,",
    "    UPPER(",
    "      REGEXP_REPLACE(",
    "        REGEXP_REPLACE(REPLACE(COALESCE(f.path, TO_VARCHAR(f.key)), '.', '__'), '\\\\[\\\\d+\\\\]', ''),",
    "        '[^A-Za-z0-9_]',",
    "        '_'",
    "      )",
    "    ) AS column_name,",
    "    TO_VARCHAR(f.value) AS column_value,",
    "    TYPEOF(f.value) AS value_type,",
    "    l._dh_ingested_at,",
    "    l._dh_source_file",
    "  FROM " + landing + " AS l,",
    "  LATERAL FLATTEN(INPUT => l.doc, RECURSIVE => TRUE, OUTER => TRUE) AS f",
    "  WHERE NOT IS_OBJECT(f.value)",
    "    AND NOT IS_ARRAY(f.value)",
    ") AS leaves",
    "WHERE column_name IS NOT NULL",
    "  AND column_name <> '';",
    "",
    "-- 4) Wide tabular table (one row per JSON document)",
    "--    Dynamic PIVOT builds columns from discovered nested paths.",
    "EXECUTE IMMEDIATE $$",
    "DECLARE",
    "  col_list STRING;",
    "  stmt STRING;",
    "BEGIN",
    "  SELECT LISTAGG('''' || column_name || '''', ', ')",
    "           WITHIN GROUP (ORDER BY column_name)",
    "    INTO col_list",
    "  FROM (",
    "    SELECT column_name",
    "    FROM " + flat,
    "    WHERE column_name IS NOT NULL",
    "    GROUP BY column_name",
    "    ORDER BY column_name",
    "    LIMIT 300",
    "  );",
    "",
    "  IF (col_list IS NULL OR LENGTH(col_list) = 0) THEN",
    "    stmt := 'CREATE OR REPLACE TABLE " + p.fqTable + " (",
    "      _dh_doc_seq NUMBER,",
    "      _dh_ingested_at TIMESTAMP_NTZ,",
    "      _dh_source_file VARCHAR",
    "    )';",
    "    EXECUTE IMMEDIATE stmt;",
    "  ELSE",
    "    stmt := 'CREATE OR REPLACE TABLE " + p.fqTable + " AS",
    "      SELECT *",
    "      FROM (",
    "        SELECT",
    "          _dh_doc_seq,",
    "          _dh_ingested_at,",
    "          _dh_source_file,",
    "          column_name,",
    "          LISTAGG(column_value, '' | '') WITHIN GROUP (ORDER BY column_value) AS column_value",
    "        FROM " + flat + "",
    "        GROUP BY _dh_doc_seq, _dh_ingested_at, _dh_source_file, column_name",
    "      )",
    "      PIVOT (MAX(column_value) FOR column_name IN (' || col_list || '))';",
    "    EXECUTE IMMEDIATE stmt;",
    "  END IF;",
    "END;",
    "$$;",
    "",
    "-- 5) Validate",
    "SELECT COUNT(*) AS landing_docs FROM " + landing + ";",
    "SELECT COUNT(*) AS flat_leaves FROM " + flat + ";",
    "SELECT COUNT(*) AS wide_rows FROM " + p.fqTable + ";",
    "SELECT * FROM " + p.fqTable + " LIMIT 20;",
    "",
    "-- Optional: keep only the wide table",
    "-- DROP TABLE IF EXISTS " + flat + ";",
    "-- DROP TABLE IF EXISTS " + landing + ";",
    "",
  ].join("\n");
}

function generateSnowflakeStageIngestSql(ctx) {
  const p = etlStageTargetParts(ctx);
  if (etlIsJsonFileExt(p.ext)) {
    return generateSnowflakeJsonFlattenSql(ctx);
  }
  const copyOpts = p.ff.copyOptions ? "\n  " + p.ff.copyOptions : "";

  return [
    "-- DataHive generated Snowflake ELT",
    "-- Pipeline : " + ctx.name,
    "-- Pattern  : Stage file → RAW table (DDL + ingestion)",
    "-- Source   : " + p.location,
    "-- Target   : " + p.fqTable,
    "-- Notes    : " + (ctx.notes || "n/a"),
    "",
    "USE WAREHOUSE DEV_WH;",
    "USE DATABASE " + p.database + ";",
    "USE SCHEMA " + p.schema + ";",
    "",
    "-- 1) File format for this landing file",
    "-- PARSE_HEADER=TRUE so INFER_SCHEMA uses CSV header names (not C1/C2/C3).",
    "CREATE OR REPLACE FILE FORMAT " + p.database + "." + p.schema + "." + p.ff.name,
    "  " + p.ff.ddl + ";",
    "",
    "-- 2) DDL — infer columns from the stage file (Snowflake INFER_SCHEMA)",
    "CREATE TABLE IF NOT EXISTS " + p.fqTable,
    "  USING TEMPLATE (",
    "    SELECT ARRAY_AGG(OBJECT_CONSTRUCT(*))",
    "    FROM TABLE(",
    "      INFER_SCHEMA(",
    "        LOCATION => '" + p.location + "',",
    "        FILE_FORMAT => '" + p.database + "." + p.schema + "." + p.ff.name + "',",
    "        IGNORE_CASE => TRUE",
    "      )",
    "    )",
    "  );",
    "",
    "-- If the table already exists with C1/C2/C3 columns, drop/rename it first:",
    "-- DROP TABLE IF EXISTS " + p.fqTable + ";",
    "-- then re-run the CREATE TABLE USING TEMPLATE above.",
    "",
    "-- Fallback DDL if INFER_SCHEMA is unavailable / file empty:",
    "-- CREATE TABLE IF NOT EXISTS " + p.fqTable + " (",
    "--   col1 VARCHAR,",
    "--   col2 VARCHAR,",
    "--   _dh_ingested_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),",
    "--   _dh_source_file VARCHAR",
    "-- );",
    "",
    "-- 3) Data ingestion from stage (MATCH_BY_COLUMN_NAME required with PARSE_HEADER)",
    "COPY INTO " + p.fqTable,
    "  FROM '" + p.location + "'",
    "  FILE_FORMAT = (FORMAT_NAME = '" + p.database + "." + p.schema + "." + p.ff.name + "')",
    "  ON_ERROR = 'ABORT_STATEMENT'" + copyOpts + ";",
    "",
    "-- 4) Optional lineage / audit columns (run once if not inferred)",
    "ALTER TABLE " + p.fqTable + " ADD COLUMN IF NOT EXISTS _dh_ingested_at TIMESTAMP_NTZ;",
    "ALTER TABLE " + p.fqTable + " ADD COLUMN IF NOT EXISTS _dh_source_file VARCHAR;",
    "UPDATE " + p.fqTable,
    "SET _dh_ingested_at = COALESCE(_dh_ingested_at, CURRENT_TIMESTAMP()),",
    "    _dh_source_file = COALESCE(_dh_source_file, '" + p.sourceFileSql + "')",
    "WHERE _dh_ingested_at IS NULL OR _dh_source_file IS NULL;",
    "",
    "-- 5) Validate",
    "SELECT COUNT(*) AS row_count FROM " + p.fqTable + ";",
    "SELECT * FROM " + p.fqTable + " LIMIT 20;",
    "",
  ].join("\n");
}

function generateGcsJsonFlattenSql(ctx) {
  const src = String(ctx.sourceObject || "").trim();
  const tgt = String(ctx.targetObject || "").trim() || "my-project.raw_dataset.flattened_table";
  const uris = src.endsWith("/") ? src + "*.json" : src;
  const tableName = etlSuggestTableFromFile(src).toLowerCase();
  const landing = tgt.includes(".") ? tgt : "my-project.raw_dataset." + tableName;
  return [
    "-- DataHive generated BigQuery ELT",
    "-- Pipeline : " + ctx.name,
    "-- Pattern  : GCS JSON (bucket/folder) → flatten → tabular table",
    "-- Source   : " + src,
    "-- Target   : " + landing,
    "-- Notes    : " + (ctx.notes || "n/a"),
    "--",
    "-- Tip: NDJSON (one JSON object per line) loads most reliably.",
    "--      A single JSON array file is better handled with Language = Python.",
    "",
    "-- 1) External table over the GCS object / folder",
    "CREATE OR REPLACE EXTERNAL TABLE `" + landing + "_ext`",
    "OPTIONS (",
    "  format = 'JSON',",
    "  uris = ['" + uris.replace(/'/g, "\\'") + "']",
    ");",
    "",
    "-- 2) Land into a managed table (STRUCT/ARRAY kept for nested fields)",
    "CREATE OR REPLACE TABLE `" + landing + "_landing` AS",
    "SELECT * FROM `" + landing + "_ext`;",
    "",
    "-- 3) Flatten nested JSON to wide tabular columns",
    "--    BigQuery keeps nested fields as RECORD/ARRAY. For deep/unknown nesting,",
    "--    regenerate with Language = Python (pandas.json_normalize).",
    "--    Example one-level flatten / array unnest (edit field names):",
    "--",
    "-- CREATE OR REPLACE TABLE `" + landing + "` AS",
    "-- SELECT",
    "--   * EXCEPT(nested_col, tags),",
    "--   nested_col.city AS nested_col_city,",
    "--   tag",
    "-- FROM `" + landing + "_landing`",
    "-- LEFT JOIN UNNEST(tags) AS tag;",
    "",
    "-- Default: promote landing → final table (top-level columns already tabular)",
    "CREATE OR REPLACE TABLE `" + landing + "` AS",
    "SELECT * FROM `" + landing + "_landing`;",
    "",
    "-- 4) Validate",
    "SELECT COUNT(*) AS row_count FROM `" + landing + "`;",
    "SELECT * FROM `" + landing + "` LIMIT 20;",
    "",
  ].join("\n");
}

function generateGcsJsonFlattenPython(ctx) {
  const src = String(ctx.sourceObject || "").trim();
  const tgt = String(ctx.targetObject || "").trim() || "my-project.raw_dataset.flattened_table";
  return [
    '"""DataHive generated GCS nested-JSON flatten → tabular table.',
    "Pipeline : " + ctx.name,
    "Source  : " + src,
    "Target  : " + tgt,
    "",
    "Downloads JSON from a GCS bucket/folder, flattens nested objects/arrays",
    "with pandas.json_normalize, then writes a wide tabular table.",
    "",
    "Auth: GOOGLE_APPLICATION_CREDENTIALS or gcloud ADC from your GCP connector.",
    '"""',
    "from __future__ import annotations",
    "",
    "import json",
    "import os",
    "import re",
    "import tempfile",
    "from datetime import datetime, timezone",
    "from pathlib import Path",
    "from typing import Any",
    "",
    "import pandas as pd",
    "from google.cloud import storage",
    "",
    "SOURCE_URI = " + JSON.stringify(src),
    "TARGET_OBJECT = " + JSON.stringify(tgt),
    "TARGET_CONNECTOR = " + JSON.stringify(ctx.targetType || "gcp"),
    "",
    "",
    "def parse_gs_uri(uri: str) -> tuple[str, str]:",
    "    m = re.match(r\"^gs://([^/]+)/?(.*)$\", uri.strip())",
    "    if not m:",
    "        raise ValueError(f\"Expected gs://bucket/path, got: {uri}\")",
    "    return m.group(1), m.group(2)",
    "",
    "",
    "def _as_records(payload: Any) -> list[dict[str, Any]]:",
    "    if payload is None:",
    "        return []",
    "    if isinstance(payload, list):",
    "        return [x if isinstance(x, dict) else {\"value\": x} for x in payload]",
    "    if isinstance(payload, dict):",
    "        for key in (\"data\", \"records\", \"items\", \"results\", \"rows\"):",
    "            if isinstance(payload.get(key), list):",
    "                return _as_records(payload[key])",
    "        return [payload]",
    "    return [{\"value\": payload}]",
    "",
    "",
    "def flatten_records(records: list[dict[str, Any]], source_file: str) -> pd.DataFrame:",
    "    if not records:",
    "        return pd.DataFrame()",
    "    df = pd.json_normalize(records, sep=\"__\")",
    "    for col in list(df.columns):",
    "        sample = df[col]",
    "        if sample.map(lambda v: isinstance(v, (list, dict))).any():",
    "            df[col] = sample.map(",
    "                lambda v: json.dumps(v, ensure_ascii=False)",
    "                if isinstance(v, (list, dict))",
    "                else v",
    "            )",
    "    df.columns = [",
    "        re.sub(r\"[^A-Za-z0-9_]+\", \"_\", str(c)).strip(\"_\").upper()",
    "        for c in df.columns",
    "    ]",
    "    df[\"_DH_INGESTED_AT\"] = datetime.now(timezone.utc).isoformat()",
    "    df[\"_DH_SOURCE_FILE\"] = source_file",
    "    return df",
    "",
    "",
    "def list_gcs_json_blobs(client: storage.Client, bucket_name: str, prefix: str):",
    "    bucket = client.bucket(bucket_name)",
    "    if prefix and not prefix.endswith(\"/\") and \".\" in Path(prefix).name:",
    "        blob = bucket.blob(prefix)",
    "        if not blob.exists(client):",
    "            raise FileNotFoundError(f\"gs://{bucket_name}/{prefix} not found\")",
    "        return [blob]",
    "    blobs = [",
    "        b",
    "        for b in client.list_blobs(bucket_name, prefix=prefix or None)",
    "        if not b.name.endswith(\"/\")",
    "        and re.search(r\"\\.(json|jsonl|ndjson)(\\.(gz))?$\", b.name, re.I)",
    "    ]",
    "    if not blobs:",
    "        raise FileNotFoundError(",
    "            f\"No JSON files under gs://{bucket_name}/{prefix}\"",
    "        )",
    "    return blobs",
    "",
    "",
    "def load_records_from_gcs() -> tuple[list[dict[str, Any]], str]:",
    "    bucket_name, prefix = parse_gs_uri(SOURCE_URI)",
    "    client = storage.Client()  # uses ADC / GOOGLE_APPLICATION_CREDENTIALS",
    "    blobs = list_gcs_json_blobs(client, bucket_name, prefix)",
    "    records: list[dict[str, Any]] = []",
    "    sources: list[str] = []",
    "    with tempfile.TemporaryDirectory(prefix=\"datahive_gcs_\") as tmp:",
    "        for blob in blobs:",
    "            local = Path(tmp) / Path(blob.name).name",
    "            blob.download_to_filename(local.as_posix())",
    "            text = local.read_text(encoding=\"utf-8\").strip()",
    "            if not text:",
    "                continue",
    "            sources.append(f\"gs://{bucket_name}/{blob.name}\")",
    "            if \"\\n\" in text and not text.lstrip().startswith(\"[\"):",
    "                for line in text.splitlines():",
    "                    line = line.strip()",
    "                    if line:",
    "                        records.extend(_as_records(json.loads(line)))",
    "            else:",
    "                records.extend(_as_records(json.loads(text)))",
    "    return records, \";\".join(sources[:5]) + (\"…\" if len(sources) > 5 else \"\")",
    "",
    "",
    "def write_target(df: pd.DataFrame) -> None:",
    "    if TARGET_CONNECTOR in {\"gcp\", \"googlecloud\"} or re.match(",
    "        r\"^[A-Za-z0-9_\\-]+\\.[A-Za-z0-9_\\-]+\\.[A-Za-z0-9_\\-]+$\", TARGET_OBJECT",
    "    ):",
    "        # project.dataset.table",
    "        import pandas_gbq",
    "",
    "        project, dataset, table = TARGET_OBJECT.split(\".\", 2)",
    "        pandas_gbq.to_gbq(",
    "            df,",
    "            destination_table=f\"{dataset}.{table}\",",
    "            project_id=project,",
    "            if_exists=\"replace\",",
    "        )",
    "        print(f\"Wrote {len(df)} rows to BigQuery {TARGET_OBJECT}\")",
    "        return",
    "    if TARGET_CONNECTOR == \"snowflake\" or TARGET_OBJECT.upper().startswith(\"SALES_DB.\"):",
    "        import snowflake.connector",
    "        from snowflake.connector.pandas_tools import write_pandas",
    "",
    "        parts = TARGET_OBJECT.split(\".\")",
    "        database = parts[0] if len(parts) >= 3 else \"SALES_DB\"",
    "        schema = parts[-2] if len(parts) >= 2 else \"RAW\"",
    "        table = parts[-1]",
    "        conn = snowflake.connector.connect(",
    "            account=os.environ.get(\"SNOWFLAKE_ACCOUNT\", \"...\"),",
    "            user=os.environ.get(\"SNOWFLAKE_USER\", \"...\"),",
    "            password=os.environ.get(\"SNOWFLAKE_PASSWORD\", \"...\"),",
    "            warehouse=os.environ.get(\"SNOWFLAKE_WAREHOUSE\", \"DEV_WH\"),",
    "            database=database,",
    "            schema=schema,",
    "        )",
    "        try:",
    "            write_pandas(",
    "                conn, df, table_name=table, database=database, schema=schema,",
    "                auto_create_table=True, overwrite=True, quote_identifiers=False,",
    "            )",
    "            print(f\"Wrote {len(df)} rows to Snowflake {database}.{schema}.{table}\")",
    "        finally:",
    "            conn.close()",
    "        return",
    "    if TARGET_OBJECT.startswith(\"gs://\"):",
    "        # Write flattened parquet next to / under the target GCS prefix",
    "        out = TARGET_OBJECT.rstrip(\"/\") + \"/flattened.parquet\"",
    "        bucket_name, prefix = parse_gs_uri(out)",
    "        with tempfile.TemporaryDirectory(prefix=\"datahive_out_\") as tmp:",
    "            local = Path(tmp) / \"flattened.parquet\"",
    "            df.to_parquet(local, index=False)",
    "            storage.Client().bucket(bucket_name).blob(prefix).upload_from_filename(",
    "                local.as_posix()",
    "            )",
    "        print(f\"Wrote {len(df)} rows to {out}\")",
    "        return",
    "    raise NotImplementedError(",
    "        f\"Wire write path for target={TARGET_OBJECT!r} connector={TARGET_CONNECTOR!r}\"",
    "    )",
    "",
    "",
    "def main() -> None:",
    "    records, source_file = load_records_from_gcs()",
    "    df = flatten_records(records, source_file)",
    "    if df.empty:",
    "        raise SystemExit(\"No JSON records found to flatten under \" + SOURCE_URI)",
    "    print(f\"Flattened {len(records)} JSON docs → {len(df)} tabular rows\")",
    "    write_target(df)",
    "",
    "",
    'if __name__ == "__main__":',
    "    main()",
    "",
  ].join("\n");
}

function generateLocalFileEtlPython(ctx) {
  const src = String(ctx.sourceObject || (etlLocalUpload && etlLocalUpload.source_object) || "").trim();
  const abs = String((ctx.localAbsolutePath || (etlLocalUpload && etlLocalUpload.absolute_path) || "")).trim();
  const tgt = String(ctx.targetObject || "").trim() || "SALES_DB.RAW.LOCAL_FILE";
  const ext = etlUriFileExt(src) || (etlLocalUpload && etlLocalUpload.ext) || "";
  const isJson = etlIsJsonFileExt(ext);
  return [
    '"""DataHive generated local-file → tabular load.',
    "Pipeline : " + ctx.name,
    "Source  : " + src,
    "Target  : " + tgt + " [" + (ctx.targetType || "") + "]",
    "",
    isJson
      ? "JSON/JSONL is flattened with pandas.json_normalize (nested → columns)."
      : "Tabular file is loaded with pandas, then written to the destination.",
    '"""',
    "from __future__ import annotations",
    "",
    "import json",
    "import os",
    "import re",
    "from datetime import datetime, timezone",
    "from pathlib import Path",
    "from typing import Any",
    "",
    "import pandas as pd",
    "",
    "SOURCE_RELATIVE = " + JSON.stringify(src),
    "SOURCE_ABSOLUTE = " + JSON.stringify(abs),
    "TARGET_OBJECT = " + JSON.stringify(tgt),
    "TARGET_CONNECTOR = " + JSON.stringify(ctx.targetType || ""),
    "",
    "",
    "def resolve_source_path() -> Path:",
    "    candidates = []",
    "    if SOURCE_ABSOLUTE:",
    "        candidates.append(Path(SOURCE_ABSOLUTE))",
    "    if SOURCE_RELATIVE:",
    "        rel = Path(SOURCE_RELATIVE)",
    "        candidates.append(rel)",
    "        candidates.append(Path(__file__).resolve().parent / rel)",
    "        candidates.append(Path.cwd() / rel)",
    "        # Pipelines saved under an older upload root still match on file name.",
    "        candidates.append(Path.cwd() / \"storage\" / \"uploads\" / rel.name)",
    "        candidates.append(Path(__file__).resolve().parent / \"storage\" / \"uploads\" / rel.name)",
    "    env = os.environ.get(\"DATAHIVE_UPLOAD_DIR\")",
    "    if env and SOURCE_RELATIVE:",
    "        candidates.append(Path(env) / Path(SOURCE_RELATIVE).name)",
    "    for p in candidates:",
    "        if p and p.is_file():",
    "            return p",
    "    raise FileNotFoundError(",
    "        \"Local upload not found. Tried: \" + \", \".join(str(p) for p in candidates if p)",
    "    )",
    "",
    "",
    "def _as_records(payload: Any) -> list[dict[str, Any]]:",
    "    if payload is None:",
    "        return []",
    "    if isinstance(payload, list):",
    "        return [x if isinstance(x, dict) else {\"value\": x} for x in payload]",
    "    if isinstance(payload, dict):",
    "        for key in (\"data\", \"records\", \"items\", \"results\", \"rows\"):",
    "            if isinstance(payload.get(key), list):",
    "                return _as_records(payload[key])",
    "        return [payload]",
    "    return [{\"value\": payload}]",
    "",
    "",
    "def read_source() -> pd.DataFrame:",
    "    path = resolve_source_path()",
    "    suffix = path.suffix.lower()",
    "    if suffix in {\".json\", \".jsonl\", \".ndjson\"}:",
    "        text = path.read_text(encoding=\"utf-8\").strip()",
    "        records: list[dict[str, Any]] = []",
    "        if \"\\n\" in text and not text.lstrip().startswith(\"[\"):",
    "            for line in text.splitlines():",
    "                line = line.strip()",
    "                if line:",
    "                    records.extend(_as_records(json.loads(line)))",
    "        else:",
    "            records.extend(_as_records(json.loads(text)))",
    "        if not records:",
    "            return pd.DataFrame()",
    "        df = pd.json_normalize(records, sep=\"__\")",
    "        for col in list(df.columns):",
    "            sample = df[col]",
    "            if sample.map(lambda v: isinstance(v, (list, dict))).any():",
    "                df[col] = sample.map(",
    "                    lambda v: json.dumps(v, ensure_ascii=False)",
    "                    if isinstance(v, (list, dict))",
    "                    else v",
    "                )",
    "    elif suffix in {\".xlsx\", \".xls\"}:",
    "        df = pd.read_excel(path)",
    "    elif suffix == \".parquet\":",
    "        df = pd.read_parquet(path)",
    "    elif suffix == \".tsv\":",
    "        df = pd.read_csv(path, sep=\"\\t\")",
    "    else:",
    "        df = pd.read_csv(path)",
    "    df.columns = [",
    "        re.sub(r\"[^A-Za-z0-9_]+\", \"_\", str(c)).strip(\"_\").upper()",
    "        for c in df.columns",
    "    ]",
    "    df[\"_DH_INGESTED_AT\"] = datetime.now(timezone.utc).isoformat()",
    "    df[\"_DH_SOURCE_FILE\"] = str(path)",
    "    return df",
    "",
    "",
    "def write_target(df: pd.DataFrame) -> None:",
    "    if TARGET_CONNECTOR in {\"gcp\", \"googlecloud\"} or re.match(",
    "        r\"^[A-Za-z0-9_\\-]+\\.[A-Za-z0-9_\\-]+\\.[A-Za-z0-9_\\-]+$\", TARGET_OBJECT",
    "    ):",
    "        import pandas_gbq",
    "",
    "        project, dataset, table = TARGET_OBJECT.split(\".\", 2)",
    "        pandas_gbq.to_gbq(",
    "            df,",
    "            destination_table=f\"{dataset}.{table}\",",
    "            project_id=project,",
    "            if_exists=\"replace\",",
    "        )",
    "        print(f\"Wrote {len(df)} rows to BigQuery {TARGET_OBJECT}\")",
    "        return",
    "    if TARGET_CONNECTOR == \"snowflake\" or \".\" in TARGET_OBJECT:",
    "        import snowflake.connector",
    "        from snowflake.connector.pandas_tools import write_pandas",
    "",
    "        parts = TARGET_OBJECT.split(\".\")",
    "        database = parts[0] if len(parts) >= 3 else \"SALES_DB\"",
    "        schema = parts[-2] if len(parts) >= 2 else \"RAW\"",
    "        table = parts[-1]",
    "        conn = snowflake.connector.connect(",
    "            account=os.environ.get(\"SNOWFLAKE_ACCOUNT\", \"...\"),",
    "            user=os.environ.get(\"SNOWFLAKE_USER\", \"...\"),",
    "            password=os.environ.get(\"SNOWFLAKE_PASSWORD\", \"...\"),",
    "            warehouse=os.environ.get(\"SNOWFLAKE_WAREHOUSE\", \"DEV_WH\"),",
    "            database=database,",
    "            schema=schema,",
    "        )",
    "        try:",
    "            write_pandas(",
    "                conn, df, table_name=table, database=database, schema=schema,",
    "                auto_create_table=True, overwrite=True, quote_identifiers=False,",
    "            )",
    "            print(f\"Wrote {len(df)} rows to Snowflake {database}.{schema}.{table}\")",
    "        finally:",
    "            conn.close()",
    "        return",
    "    if TARGET_CONNECTOR == \"postgres\":",
    "        from urllib.parse import quote_plus",
    "        from sqlalchemy import create_engine",
    "",
    "        conninfo = (os.environ.get(\"POSTGRES_CONNINFO\") or os.environ.get(\"POSTGRES_URI\") or \"\").strip()",
    "        if not conninfo:",
    "            user = os.environ.get(\"POSTGRES_USER\", \"\").strip()",
    "            password = os.environ.get(\"POSTGRES_PASSWORD\", \"\")",
    "            host = os.environ.get(\"POSTGRES_HOST\", \"localhost\").strip() or \"localhost\"",
    "            port = os.environ.get(\"POSTGRES_PORT\", \"5432\").strip() or \"5432\"",
    "            database = os.environ.get(\"POSTGRES_DATABASE\", \"\").strip()",
    "            if not user or not database:",
    "                raise RuntimeError(",
    "                    \"Set POSTGRES_CONNINFO or POSTGRES_USER/POSTGRES_PASSWORD/\"",
    "                    \"POSTGRES_HOST/POSTGRES_PORT/POSTGRES_DATABASE in .env\"",
    "                )",
    "            conninfo = (",
    "                f\"postgresql+psycopg://{quote_plus(user)}:{quote_plus(password)}\"",
    "                f\"@{host}:{port}/{database}\"",
    "            )",
    "        engine = create_engine(conninfo)",
    "        df.to_sql(TARGET_OBJECT, engine, if_exists=\"replace\", index=False)",
    "        print(f\"Wrote {len(df)} rows to Postgres {TARGET_OBJECT}\")",
    "        return",
    "    out = Path(TARGET_OBJECT)",
    "    if out.suffix.lower() == \".parquet\" or TARGET_OBJECT.endswith(\"/\"):",
    "        dest = out if out.suffix else out / \"flattened.parquet\"",
    "        dest.parent.mkdir(parents=True, exist_ok=True)",
    "        df.to_parquet(dest, index=False)",
    "        print(f\"Wrote {len(df)} rows to {dest}\")",
    "        return",
    "    raise NotImplementedError(",
    "        f\"Wire write path for target={TARGET_OBJECT!r} connector={TARGET_CONNECTOR!r}\"",
    "    )",
    "",
    "",
    "def main() -> None:",
    "    df = read_source()",
    "    if df.empty:",
    "        raise SystemExit(\"No rows loaded from \" + SOURCE_RELATIVE)",
    "    print(f\"Loaded {len(df)} tabular rows from local file\")",
    "    write_target(df)",
    "",
    "",
    'if __name__ == "__main__":',
    "    main()",
    "",
  ].join("\n");
}

function generateLocalFileEtlSql(ctx) {
  const src = String(ctx.sourceObject || "").trim();
  const tgt = String(ctx.targetObject || "SALES_DB.RAW.LOCAL_FILE").trim();
  return [
    "-- DataHive generated local-file ELT notes",
    "-- Pipeline : " + ctx.name,
    "-- Source   : " + src + " (local upload under storage/uploads/)",
    "-- Target   : " + tgt,
    "--",
    "-- Local files cannot be read directly by Snowflake/BigQuery SQL.",
    "-- Regenerate with Language = Python to flatten JSON and load the table,",
    "-- or PUT the file to a stage / GCS bucket first, then use stage / gs:// source.",
    "",
    "-- Example after staging to Snowflake:",
    "-- PUT file:///" + src.replace(/\\/g, "/") + " @SALES_DB.RAW.RAW_STAGE AUTO_COMPRESS=FALSE OVERWRITE=TRUE;",
    "-- Then switch Source kind to \"Snowflake stage file\" and generate again.",
    "",
  ].join("\n");
}

function generateEtlSqlScript(ctx) {
  if (ctx.sourceKind === "stage_file" || ctx.isStageIngest) {
    return generateSnowflakeStageIngestSql(ctx);
  }
  if (etlIsLocalUploadSource(ctx)) {
    return generateLocalFileEtlSql(ctx);
  }
  if (etlIsGcsJsonSource(ctx)) {
    return generateGcsJsonFlattenSql(ctx);
  }
  const srcDialect = etlSqlDialect(ctx.sourceType);
  const tgtDialect = etlSqlDialect(ctx.targetType);
  const srcObj = etlQuoteIdent(ctx.sourceObject, srcDialect);
  const tgtObj = etlQuoteIdent(ctx.targetObject, tgtDialect);
  const lines = [
    "-- DataHive generated transformation (SQL)",
    "-- Pipeline : " + ctx.name,
    "-- Source  : " + ctx.sourceLabel + " [" + ctx.sourceType + "] → " + ctx.sourceObject,
    "-- Target  : " + ctx.targetLabel + " [" + ctx.targetType + "] → " + ctx.targetObject,
    "-- Notes   : " + (ctx.notes || "n/a"),
    "",
    "-- Staging extract from source",
    "CREATE OR REPLACE TEMP TABLE stg_extract AS",
    "SELECT",
    "  *,",
    "  CURRENT_TIMESTAMP AS _dh_ingested_at,",
    "  '" + ctx.sourceType + "' AS _dh_source_system",
    "FROM " + srcObj + ";",
    "",
    "-- Light transforms (rename / cast / quality filters — edit as needed)",
    "CREATE OR REPLACE TEMP TABLE stg_transform AS",
    "SELECT",
    "  *",
    "FROM stg_extract",
    "WHERE 1 = 1;",
    "",
  ];
  if (ctx.sourceType === ctx.targetType || (srcDialect === tgtDialect && srcDialect !== "tsql")) {
    lines.push(
      "-- Load into destination (same SQL dialect)",
      "CREATE TABLE IF NOT EXISTS " + tgtObj + " AS",
      "SELECT * FROM stg_transform WHERE 1 = 0;",
      "",
      "INSERT INTO " + tgtObj,
      "SELECT * FROM stg_transform;",
      "",
      "-- Optional idempotent merge pattern",
      "-- MERGE INTO " + tgtObj + " AS t",
      "-- USING stg_transform AS s",
      "-- ON t.id = s.id",
      "-- WHEN MATCHED THEN UPDATE SET ...",
      "-- WHEN NOT MATCHED THEN INSERT ...;"
    );
  } else {
    lines.push(
      "-- Cross-platform note:",
      "-- Source dialect=" + srcDialect + ", target dialect=" + tgtDialect + ".",
      "-- Run the extract on the source engine, land files/rows in an exchange zone,",
      "-- then load into the target with its native SQL / COPY command.",
      "",
      "-- Target load skeleton (" + tgtDialect + ")",
      "CREATE TABLE IF NOT EXISTS " + tgtObj + " AS",
      "SELECT * FROM stg_transform WHERE 1 = 0;",
      "",
      "INSERT INTO " + tgtObj,
      "SELECT * FROM stg_transform;"
    );
  }
  return lines.join("\n");
}

function generateSnowflakeJsonFlattenPython(ctx) {
  const p = etlStageTargetParts(ctx);
  return [
    '"""DataHive generated Snowflake nested-JSON flatten → tabular RAW.',
    "Pipeline : " + ctx.name,
    "Source  : " + p.location,
    "Target  : " + p.fqTable,
    "",
    "Reads JSON from the Snowflake stage, flattens nested objects/arrays with",
    "pandas.json_normalize, and loads a wide tabular table via write_pandas.",
    '"""',
    "from __future__ import annotations",
    "",
    "import json",
    "import os",
    "import tempfile",
    "from datetime import datetime, timezone",
    "from pathlib import Path",
    "from typing import Any",
    "",
    "import pandas as pd",
    "import snowflake.connector",
    "from snowflake.connector.pandas_tools import write_pandas",
    "",
    "STAGE_LOCATION = " + JSON.stringify(p.location),
    "TARGET_DATABASE = " + JSON.stringify(p.database),
    "TARGET_SCHEMA = " + JSON.stringify(p.schema),
    "TARGET_TABLE = " + JSON.stringify(p.table),
    "SOURCE_FILE = " + JSON.stringify(p.filePath),
    "",
    "",
    "def connect():",
    "    # Fill from connector_dtls / env — do not hardcode secrets.",
    "    return snowflake.connector.connect(",
    '        account=os.environ.get("SNOWFLAKE_ACCOUNT", "..."),',
    '        user=os.environ.get("SNOWFLAKE_USER", "..."),',
    '        password=os.environ.get("SNOWFLAKE_PASSWORD", "..."),',
    '        warehouse=os.environ.get("SNOWFLAKE_WAREHOUSE", "DEV_WH"),',
    "        database=TARGET_DATABASE,",
    "        schema=TARGET_SCHEMA,",
    "    )",
    "",
    "",
    "def _as_records(payload: Any) -> list[dict[str, Any]]:",
    "    if payload is None:",
    "        return []",
    "    if isinstance(payload, list):",
    "        return [x if isinstance(x, dict) else {\"value\": x} for x in payload]",
    "    if isinstance(payload, dict):",
    "        for key in (\"data\", \"records\", \"items\", \"results\", \"rows\"):",
    "            if isinstance(payload.get(key), list):",
    "                return _as_records(payload[key])",
    "        return [payload]",
    "    return [{\"value\": payload}]",
    "",
    "",
    "def flatten_records(records: list[dict[str, Any]]) -> pd.DataFrame:",
    "    if not records:",
    "        return pd.DataFrame()",
    "    df = pd.json_normalize(records, sep=\"__\")",
    "    for col in list(df.columns):",
    "        sample = df[col]",
    "        if sample.map(lambda v: isinstance(v, (list, dict))).any():",
    "            df[col] = sample.map(",
    "                lambda v: json.dumps(v, ensure_ascii=False)",
    "                if isinstance(v, (list, dict))",
    "                else v",
    "            )",
    "    df.columns = [",
    "        str(c)",
    "        .replace(\".\", \"__\")",
    "        .replace(\" \", \"_\")",
    "        .replace(\"-\", \"_\")",
    "        .upper()",
    "        for c in df.columns",
    "    ]",
    "    df[\"_DH_INGESTED_AT\"] = datetime.now(timezone.utc).isoformat()",
    "    df[\"_DH_SOURCE_FILE\"] = SOURCE_FILE",
    "    return df",
    "",
    "",
    "def download_stage_json(conn) -> list[dict[str, Any]]:",
    "    with tempfile.TemporaryDirectory(prefix=\"datahive_json_\") as tmp:",
    "        local_dir = Path(tmp)",
    "        with conn.cursor() as cur:",
    "            cur.execute(\"USE DATABASE IDENTIFIER(%s)\", (TARGET_DATABASE,))",
    "            cur.execute(\"USE SCHEMA IDENTIFIER(%s)\", (TARGET_SCHEMA,))",
    "            cur.execute(f\"GET {STAGE_LOCATION} file://{local_dir.as_posix()}/\")",
    "        files = sorted(",
    "            [",
    "                *local_dir.glob(\"*.json\"),",
    "                *local_dir.glob(\"*.jsonl\"),",
    "                *local_dir.glob(\"*.ndjson\"),",
    "                *local_dir.glob(\"*\")",
    "            ]",
    "        )",
    "        seen = set()",
    "        unique_files = []",
    "        for f in files:",
    "            if f.is_file() and f.resolve() not in seen:",
    "                seen.add(f.resolve())",
    "                unique_files.append(f)",
    "        records: list[dict[str, Any]] = []",
    "        for path in unique_files:",
    "            text = path.read_text(encoding=\"utf-8\").strip()",
    "            if not text:",
    "                continue",
    "            if \"\\n\" in text and not text.lstrip().startswith(\"[\"):",
    "                for line in text.splitlines():",
    "                    line = line.strip()",
    "                    if not line:",
    "                        continue",
    "                    records.extend(_as_records(json.loads(line)))",
    "            else:",
    "                records.extend(_as_records(json.loads(text)))",
    "        return records",
    "",
    "",
    "def main() -> None:",
    "    conn = connect()",
    "    try:",
    "        records = download_stage_json(conn)",
    "        df = flatten_records(records)",
    "        if df.empty:",
    "            raise SystemExit(\"No JSON records found to flatten.\")",
    "        ok, nchunks, nrows, _ = write_pandas(",
    "            conn,",
    "            df,",
    "            table_name=TARGET_TABLE,",
    "            database=TARGET_DATABASE,",
    "            schema=TARGET_SCHEMA,",
    "            auto_create_table=True,",
    "            overwrite=True,",
    "            quote_identifiers=False,",
    "        )",
    "        print(",
    "            f\"Flattened {len(records)} JSON docs → {nrows} tabular rows \"",
    "            f\"into {TARGET_DATABASE}.{TARGET_SCHEMA}.{TARGET_TABLE} \"",
    "            f\"(ok={ok}, chunks={nchunks})\"",
    "        )",
    "    finally:",
    "        conn.close()",
    "",
    "",
    'if __name__ == "__main__":',
    "    main()",
    "",
  ].join("\n");
}

function generateSnowflakeStageIngestPython(ctx, opts) {
  const p = etlStageTargetParts(ctx);
  if (etlIsJsonFileExt(p.ext)) {
    return generateSnowflakeJsonFlattenPython(ctx);
  }
  const sql = generateSnowflakeStageIngestSql(ctx);
  const label = (opts && opts.viaLabel) || "Python";
  return [
    '"""DataHive generated Snowflake stage → RAW table load (' + label + ").",
    "Pipeline : " + ctx.name,
    "Source  : " + ctx.sourceLabel + " [" + ctx.sourceType + "] → " + ctx.sourceObject,
    "Target  : " + ctx.targetLabel + " [" + ctx.targetType + "] → " + ctx.targetObject,
    "",
    "Uses snowflake-connector-python to run DDL + COPY INTO.",
    "PySpark is not required for internal Snowflake stage loads.",
    '"""',
    "from __future__ import annotations",
    "",
    "import snowflake.connector",
    "",
    "SQL_SCRIPT = " + JSON.stringify(sql),
    "",
    "",
    "def main() -> None:",
    "    # Fill connection from connector_dtls / env — do not hardcode secrets.",
    "    conn = snowflake.connector.connect(",
    "        account=\"...\",",
    "        user=\"...\",",
    "        password=\"...\",",
    "        warehouse=\"DEV_WH\",",
    "        database=\"SALES_DB\",",
    "        schema=\"RAW\",",
    "    )",
    "    try:",
    "        with conn.cursor() as cur:",
    "            for stmt in [s.strip() for s in SQL_SCRIPT.split(\";\") if s.strip()]:",
    "                cur.execute(stmt)",
    "                print(\"OK:\", stmt.splitlines()[0][:120])",
    "    finally:",
    "        conn.close()",
    "",
    "",
    'if __name__ == "__main__":',
    "    main()",
    "",
  ].join("\n");
}

function generateEtlPythonScript(ctx) {
  if (ctx.sourceKind === "stage_file" || ctx.isStageIngest) {
    return generateSnowflakeStageIngestPython(ctx, { viaLabel: "Python" });
  }
  if (etlIsLocalUploadSource(ctx)) {
    return generateLocalFileEtlPython(ctx);
  }
  if (etlIsGcsJsonSource(ctx)) {
    return generateGcsJsonFlattenPython(ctx);
  }
  const src = ctx.sourceObject;
  const tgt = ctx.targetObject;
  return [
    '"""DataHive generated transformation (Python)',
    "Pipeline : " + ctx.name,
    "Source  : " + ctx.sourceLabel + " [" + ctx.sourceType + "] → " + src,
    "Target  : " + ctx.targetLabel + " [" + ctx.targetType + "] → " + tgt,
    '"""',
    "from __future__ import annotations",
    "",
    "from datetime import datetime, timezone",
    "",
    "import pandas as pd",
    "",
    "SOURCE_CONNECTOR = " + JSON.stringify(ctx.sourceType),
    "TARGET_CONNECTOR = " + JSON.stringify(ctx.targetType),
    "SOURCE_OBJECT = " + JSON.stringify(src),
    "TARGET_OBJECT = " + JSON.stringify(tgt),
    "",
    "",
    "def read_source() -> pd.DataFrame:",
    '    """Load source rows — swap in connector SDK / SQLAlchemy / boto3 as needed."""',
    "    if SOURCE_CONNECTOR in {\"aws\"} or SOURCE_OBJECT.startswith(\"s3://\"):",
    "        # Example: df = pd.read_parquet(SOURCE_OBJECT)",
    "        raise NotImplementedError(\"Wire AWS credentials from connector_dtls here\")",
    "    if SOURCE_CONNECTOR in {\"gcp\"} or SOURCE_OBJECT.startswith(\"gs://\"):",
    "        # For JSON in GCS use Source object = gs://bucket/folder/file.json",
    "        raise NotImplementedError(\"Wire GCP credentials from connector_dtls here\")",
    "    if SOURCE_CONNECTOR in {\"azure\"}:",
    "        raise NotImplementedError(\"Wire Azure credentials from connector_dtls here\")",
    "    if SOURCE_CONNECTOR in {\"snowflake\"}:",
    "        raise NotImplementedError(\"Wire Snowflake connector here\")",
    "    # Default: Postgres / SQLAlchemy",
    "    # from sqlalchemy import create_engine",
    "    # engine = create_engine(os.environ[\"POSTGRES_CONNINFO\"])",
    "    # return pd.read_sql(f\"SELECT * FROM {SOURCE_OBJECT}\", engine)",
    "    return pd.DataFrame()",
    "",
    "",
    "def transform(df: pd.DataFrame) -> pd.DataFrame:",
    "    out = df.copy()",
    "    out[\"_dh_ingested_at\"] = datetime.now(timezone.utc).isoformat()",
    "    out[\"_dh_source_system\"] = SOURCE_CONNECTOR",
    "    # Add renames, casts, and quality rules here.",
    "    return out",
    "",
    "",
    "def write_target(df: pd.DataFrame) -> None:",
    '    """Persist transformed rows to the destination connector."""',
    "    if TARGET_CONNECTOR in {\"aws\"} or TARGET_OBJECT.startswith(\"s3://\"):",
    "        # df.to_parquet(TARGET_OBJECT, index=False)",
    "        raise NotImplementedError(\"Wire AWS write path here\")",
    "    if TARGET_CONNECTOR in {\"gcp\"}:",
    "        raise NotImplementedError(\"Wire BigQuery / GCS write here\")",
    "    if TARGET_CONNECTOR in {\"azure\"}:",
    "        raise NotImplementedError(\"Wire Azure write here\")",
    "    if TARGET_CONNECTOR in {\"snowflake\"}:",
    "        raise NotImplementedError(\"Wire Snowflake write here\")",
    "    # Default Postgres path",
    "    # df.to_sql(TARGET_OBJECT, engine, if_exists=\"append\", index=False)",
    "    print(f\"Would write {len(df)} rows to {TARGET_OBJECT} via {TARGET_CONNECTOR}\")",
    "",
    "",
    "def main() -> None:",
    "    raw = read_source()",
    "    clean = transform(raw)",
    "    write_target(clean)",
    "",
    "",
    'if __name__ == \"__main__\":',
    "    main()",
    "",
  ].join("\n");
}

function generateEtlPySparkScript(ctx) {
  // Internal Snowflake stage → RAW uses COPY INTO; Spark is the wrong engine.
  if (ctx.sourceKind === "stage_file" || ctx.isStageIngest) {
    return generateSnowflakeStageIngestPython(ctx, {
      viaLabel: "Python · Snowflake COPY (not PySpark)",
    });
  }
  if (etlIsLocalUploadSource(ctx)) {
    return generateLocalFileEtlPython(ctx);
  }
  // Nested JSON from GCS is flattened with pandas, not Spark.
  if (etlIsGcsJsonSource(ctx)) {
    return generateGcsJsonFlattenPython(ctx);
  }
  const src = ctx.sourceObject;
  const tgt = ctx.targetObject;
  const srcFormat =
    ctx.sourceType === "aws" || String(src).startsWith("s3://")
      ? "parquet"
      : ctx.sourceType === "snowflake"
        ? "snowflake"
        : ctx.sourceType === "gcp"
          ? "bigquery"
          : "jdbc";
  const tgtFormat =
    ctx.targetType === "aws" || String(tgt).startsWith("s3://")
      ? "parquet"
      : ctx.targetType === "snowflake"
        ? "snowflake"
        : ctx.targetType === "gcp"
          ? "bigquery"
          : "jdbc";
  return [
    '"""DataHive generated transformation (PySpark)',
    "Pipeline : " + ctx.name,
    "Source  : " + ctx.sourceLabel + " [" + ctx.sourceType + "] → " + src,
    "Target  : " + ctx.targetLabel + " [" + ctx.targetType + "] → " + tgt,
    "",
    "Requires: pip install pyspark  (and a Spark runtime).",
    "For Snowflake stage → RAW loads, use Language = SQL or Python instead.",
    '"""',
    "from pyspark.sql import SparkSession",
    "from pyspark.sql import functions as F",
    "",
    "SOURCE_CONNECTOR = " + JSON.stringify(ctx.sourceType),
    "TARGET_CONNECTOR = " + JSON.stringify(ctx.targetType),
    "SOURCE_OBJECT = " + JSON.stringify(src),
    "TARGET_OBJECT = " + JSON.stringify(tgt),
    "",
    "",
    "def build_spark() -> SparkSession:",
    "    return (",
    "        SparkSession.builder.appName(" + JSON.stringify("datahive-" + (ctx.name || "pipeline")) + ")",
    '        .config("spark.sql.session.timeZone", "UTC")',
    "        .getOrCreate()",
    "    )",
    "",
    "",
    "def read_source(spark: SparkSession):",
    "    fmt = " + JSON.stringify(srcFormat),
    "    if fmt == \"parquet\":",
    "        return spark.read.parquet(SOURCE_OBJECT)",
    "    if fmt == \"bigquery\":",
    '        return spark.read.format("bigquery").option("table", SOURCE_OBJECT).load()',
    "    if fmt == \"snowflake\":",
    "        return (",
    '            spark.read.format("snowflake")',
    '            .options(**{})  # fill sfURL / sfUser / pem from connector_dtls',
    '            .option("dbtable", SOURCE_OBJECT)',
    "            .load()",
    "        )",
    "    # JDBC / Postgres default",
    "    return (",
    '        spark.read.format("jdbc")',
    '        .option("url", "jdbc:postgresql://localhost:5432/datahivepoc")',
    '        .option("dbtable", SOURCE_OBJECT)',
    '        .option("user", "postgres")',
    '        .option("password", "***")',
    "        .load()",
    "    )",
    "",
    "",
    "def transform(df):",
    "    return (",
    "        df",
    '        .withColumn("_dh_ingested_at", F.current_timestamp())',
    '        .withColumn("_dh_source_system", F.lit(SOURCE_CONNECTOR))',
    "        # .filter(...).withColumnRenamed(...)",
    "    )",
    "",
    "",
    "def write_target(df) -> None:",
    "    fmt = " + JSON.stringify(tgtFormat),
    "    if fmt == \"parquet\":",
    '        df.write.mode("overwrite").parquet(TARGET_OBJECT)',
    "        return",
    "    if fmt == \"bigquery\":",
    "        (",
    '            df.write.format("bigquery")',
    '            .option("table", TARGET_OBJECT)',
    '            .mode("append")',
    "            .save()",
    "        )",
    "        return",
    "    if fmt == \"snowflake\":",
    "        (",
    '            df.write.format("snowflake")',
    "            .options(**{})",
    '            .option("dbtable", TARGET_OBJECT)',
    '            .mode("append")',
    "            .save()",
    "        )",
    "        return",
    "    (",
    '        df.write.format("jdbc")',
    '        .option("url", "jdbc:postgresql://localhost:5432/datahivepoc")',
    '        .option("dbtable", TARGET_OBJECT)',
    '        .option("user", "postgres")',
    '        .option("password", "***")',
    '        .mode("append")',
    "        .save()",
    "    )",
    "",
    "",
    "def main() -> None:",
    "    spark = build_spark()",
    "    try:",
    "        raw = read_source(spark)",
    "        clean = transform(raw)",
    "        write_target(clean)",
    "    finally:",
    "        spark.stop()",
    "",
    "",
    'if __name__ == "__main__":',
    "    main()",
    "",
  ].join("\n");
}

function buildEtlScriptContext() {
  const name = ($("#etl_name").value || "").trim() || "untitled_pipeline";
  const sourceType = $("#etl_source_type").value;
  const targetType = $("#etl_target_type").value;
  const sourceConnKey = $("#etl_source_conn").value;
  const targetConnKey = $("#etl_target_conn").value;
  const srcConn = findEtlConnection(sourceConnKey);
  const tgtConn = findEtlConnection(targetConnKey);
  const sourceKind = ($("#etl_source_kind") && $("#etl_source_kind").value) || "object";
  const stageFqn = ($("#etl_source_stage") && $("#etl_source_stage").value) || "";
  const stageFilePath = ($("#etl_source_file") && $("#etl_source_file").value) || "";
  const stageFileOpt =
    $("#etl_source_file") && $("#etl_source_file").selectedOptions[0]
      ? $("#etl_source_file").selectedOptions[0]
      : null;
  const stageFileExt = stageFileOpt ? stageFileOpt.dataset.ext || "" : "";
  const targetKind = ($("#etl_target_kind") && $("#etl_target_kind").value) || "object";
  let sourceObject =
    ($("#etl_source_object").value || "").trim() ||
    etlDefaultObject("source", sourceType, sourceKind);
  if (sourceKind === "stage_file" && stageFqn && stageFilePath) {
    sourceObject = "@" + stageFqn.replace(/^@/, "") + "/" + stageFilePath.replace(/^\//, "");
  }
  let targetObject =
    ($("#etl_target_object").value || "").trim() ||
    etlDefaultObject("target", targetType, targetKind);
  if (sourceKind === "stage_file" && !($("#etl_target_object") && $("#etl_target_object").value.trim())) {
    targetObject = "SALES_DB.RAW." + etlSuggestTableFromFile(stageFilePath || sourceObject);
  }
  const isStageIngest =
    sourceKind === "stage_file" ||
    (sourceType === "snowflake" && String(sourceObject).startsWith("@"));
  const isLocalUpload = sourceKind === "local_file" || /^UPLOAD\//i.test(sourceObject);
  if (isLocalUpload && etlLocalUpload && etlLocalUpload.source_object) {
    sourceObject = etlLocalUpload.source_object;
  }
  if (isLocalUpload && !sourceType) {
    // synthetic source connector for local uploads
  }
  return {
    name,
    sourceType: isLocalUpload && !sourceType ? "upload" : sourceType,
    targetType,
    sourceConnKey: isLocalUpload ? "__local_file__" : sourceConnKey,
    targetConnKey,
    sourceLabel: isLocalUpload
      ? (etlLocalUpload && etlLocalUpload.file_name) || sourceObject || "Local file"
      : srcConn
        ? connectionLabel(srcConn)
        : sourceConnKey || etlPlatformLabel(sourceType),
    targetLabel: tgtConn ? connectionLabel(tgtConn) : targetConnKey || etlPlatformLabel(targetType),
    sourceObject,
    targetObject,
    sourceKind,
    targetKind,
    stageFqn: stageFqn.replace(/^@/, ""),
    stageFilePath,
    stageFileExt,
    isStageIngest,
    isLocalUpload,
    isBigQuerySource:
      sourceKind === "bigquery_table" ||
      (sourceType === "gcp" &&
        sourceKind !== "gcs_uri" &&
        sourceKind !== "local_file" &&
        !etlIsGcsUri(sourceObject)),
    isGcsSource: sourceKind === "gcs_uri" || etlIsGcsUri(sourceObject),
    isBigQueryTarget:
      targetKind === "bigquery_table" ||
      (targetType === "gcp" && targetKind !== "gcs_uri" && !etlIsGcsUri(targetObject)),
    localAbsolutePath: (etlLocalUpload && etlLocalUpload.absolute_path) || "",
    localFileExt: (etlLocalUpload && etlLocalUpload.ext) || etlUriFileExt(sourceObject),
    notes: ($("#etl_notes").value || "").trim(),
    language: selectedEtlLanguage(),
  };
}

function etlSnowflakeConnectorId() {
  const key = ($("#etl_source_conn") && $("#etl_source_conn").value) || "";
  if (!key || key === "__configure__") return "";
  const conn = findEtlConnection(key);
  return (conn && conn.id) || key;
}

function updateEtlSourceKindUi(preferredKind) {
  const sourceType = ($("#etl_source_type") && $("#etl_source_type").value) || "";
  const kindSel = $("#etl_source_kind");
  const kindWrap = $("#etl_source_kind_wrap");
  const stageWrap = $("#etl_stage_wrap");
  const fileWrap = $("#etl_stage_file_wrap");
  const localWrap = $("#etl_local_upload_wrap");
  const connWrap = $("#etl_source_conn_wrap");
  const objectWrap = $("#etl_source_object_wrap");
  const typeField = $("#etl_source_type") && $("#etl_source_type").closest(".field");

  if (kindWrap) kindWrap.classList.remove("hidden");
  rebuildEtlKindSelect(kindSel, sourceType, "source", preferredKind);

  const kind = (kindSel && kindSel.value) || "object";
  const isSnowflake = sourceType === "snowflake";
  const localMode = kind === "local_file";
  const stageMode = kind === "stage_file";
  const bqMode = kind === "bigquery_table";
  const gcsMode = kind === "gcs_uri";

  if (stageWrap) stageWrap.classList.toggle("hidden", !(stageMode && isSnowflake));
  if (fileWrap) fileWrap.classList.toggle("hidden", !(stageMode && isSnowflake));
  if (localWrap) localWrap.classList.toggle("hidden", !localMode);
  if (connWrap) connWrap.classList.toggle("hidden", localMode);
  if (objectWrap) objectWrap.classList.toggle("hidden", localMode || (stageMode && isSnowflake));
  if (typeField) {
    if (localMode && $("#etl_source_type") && !$("#etl_source_type").value) {
      $("#etl_source_type").value = "upload";
    }
  }
  if (localMode) {
    const srcConn = $("#etl_source_conn");
    if (srcConn) {
      srcConn.required = false;
      srcConn.disabled = false;
      srcConn.innerHTML =
        '<option value="__local_file__" selected>Local uploaded file</option>';
    }
  } else {
    const srcConn = $("#etl_source_conn");
    if (srcConn) {
      srcConn.required = true;
      if (srcConn.value === "__local_file__" || srcConn.querySelector('option[value="__local_file__"]')) {
        fillEtlConnectionSelect(srcConn, sourceType, "");
      }
    }
  }

  const kindHelp = $("#etl_source_kind_help");
  if (kindHelp) {
    if (localMode) {
      kindHelp.textContent = "Upload a local CSV, Excel, JSON, or Parquet file as the pipeline source.";
    } else if (stageMode) {
      kindHelp.textContent = "Load a file from a Snowflake stage into a RAW table.";
    } else if (bqMode) {
      kindHelp.textContent =
        "Read from a BigQuery table using project.dataset.table (full three-part name).";
    } else if (gcsMode) {
      kindHelp.textContent =
        "Read files from a GCS bucket (gs://bucket/path). JSON folders are flattened.";
    } else if (kind === "s3_uri") {
      kindHelp.textContent = "Read from an S3 URI (s3://bucket/path).";
    } else if (kind === "adls_uri") {
      kindHelp.textContent = "Read from Azure Data Lake / ABFSS URI.";
    } else {
      kindHelp.textContent = "Point at a table, view, or connector object.";
    }
  }

  const objLabel = $("#etl_source_object_label");
  if (objLabel) {
    if (bqMode) objLabel.textContent = "BigQuery table";
    else if (gcsMode) objLabel.textContent = "GCS URI";
    else if (kind === "s3_uri") objLabel.textContent = "S3 URI";
    else if (kind === "adls_uri") objLabel.textContent = "ADLS URI";
    else objLabel.textContent = "Source object";
  }

  const help = $("#etl_source_object_help");
  const srcInput = $("#etl_source_object");
  const placeholder = etlDefaultObject("source", sourceType, kind);
  if (srcInput) srcInput.placeholder = placeholder;
  if (help) {
    if (localMode) {
      help.textContent = "Filled automatically after upload (storage/uploads/…).";
    } else if (stageMode) {
      help.textContent = "Auto-filled from the selected stage file. Used in COPY INTO LOCATION.";
    } else if (bqMode) {
      help.textContent =
        "Full name: project.dataset.table — e.g. " + placeholder + ". Both SQL and PySpark use the BigQuery dialect.";
    } else if (gcsMode) {
      help.textContent =
        "Use gs://bucket/folder/file.json or gs://bucket/folder/ for a JSON landing zone.";
    } else {
      help.textContent = "Schema.table, dataset.table, or path used in the generated script.";
    }
  }
  if (stageMode && isSnowflake) {
    if ($("#etl_target_type") && !$("#etl_target_type").value) {
      $("#etl_target_type").value = "snowflake";
      fillEtlConnectionSelect($("#etl_target_conn"), "snowflake", $("#etl_source_conn").value);
      updateEtlTargetKindUi();
    }
    if ($("#etl_target_conn") && !$("#etl_target_conn").value && $("#etl_source_conn").value) {
      $("#etl_target_conn").value = $("#etl_source_conn").value;
    }
  }
  // When GCP BigQuery is the source and destination is empty, default to BigQuery too.
  if (bqMode && sourceType === "gcp" && $("#etl_target_type") && !$("#etl_target_type").value) {
    $("#etl_target_type").value = "gcp";
    fillEtlConnectionSelect($("#etl_target_conn"), "gcp", $("#etl_source_conn").value);
    updateEtlTargetKindUi("bigquery_table");
  }
}

function updateEtlTargetKindUi(preferredKind) {
  const targetType = ($("#etl_target_type") && $("#etl_target_type").value) || "";
  const kindSel = $("#etl_target_kind");
  const kindWrap = $("#etl_target_kind_wrap");
  if (kindWrap) kindWrap.classList.toggle("hidden", !targetType);
  rebuildEtlKindSelect(kindSel, targetType, "target", preferredKind);
  const kind = (kindSel && kindSel.value) || "object";

  const kindHelp = $("#etl_target_kind_help");
  if (kindHelp) {
    if (kind === "bigquery_table") {
      kindHelp.textContent = "Write to a BigQuery table (project.dataset.table).";
    } else if (kind === "gcs_uri") {
      kindHelp.textContent = "Write files to a GCS bucket (gs://bucket/path/).";
    } else if (kind === "s3_uri") {
      kindHelp.textContent = "Write to an S3 URI.";
    } else if (kind === "adls_uri") {
      kindHelp.textContent = "Write to Azure Data Lake / ABFSS.";
    } else {
      kindHelp.textContent = "Destination table, view, or URI for the selected connector.";
    }
  }

  const objLabel = $("#etl_target_object_label");
  if (objLabel) {
    if (kind === "bigquery_table") objLabel.textContent = "BigQuery table";
    else if (kind === "gcs_uri") objLabel.textContent = "GCS URI";
    else if (kind === "s3_uri") objLabel.textContent = "S3 URI";
    else if (kind === "adls_uri") objLabel.textContent = "ADLS URI";
    else objLabel.textContent = "Destination object";
  }

  const tgtInput = $("#etl_target_object");
  const help = $("#etl_target_object_help");
  const placeholder = etlDefaultObject("target", targetType, kind);
  if (tgtInput) tgtInput.placeholder = placeholder;
  if (help) {
    if (kind === "bigquery_table") {
      help.textContent = "Full name: project.dataset.table — e.g. " + placeholder + ".";
    } else if (kind === "gcs_uri") {
      help.textContent = "Destination prefix or file, e.g. " + placeholder + ".";
    } else {
      help.textContent =
        "Destination table or path. Stage loads default to SALES_DB.RAW.<FILE_TABLE>.";
    }
  }
}

async function uploadEtlLocalFile(file) {
  if (!file) return;
  if (!/\.(csv|tsv|txt|xlsx|xls|json|jsonl|ndjson|parquet)$/i.test(file.name)) {
    return showEtlError("Please choose a CSV, Excel, JSON, or Parquet file.");
  }
  if (file.size > 50 * 1024 * 1024) {
    return showEtlError("File is too large. Maximum size is 50 MB.");
  }
  showEtlOk("Uploading " + file.name + "…");
  try {
    const fd = new FormData();
    fd.append("file", file, file.name);
    const res = await fetch(etlApiBaseUrl() + "/api/etl/upload", {
      method: "POST",
      body: fd,
      headers: { "X-DataHive-User": "etl-upload" },
    });
    const text = await res.text();
    let data = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch (_e) {
      data = { detail: text };
    }
    if (!res.ok) {
      throw new Error(
        (data && (data.detail || data.message)) || "Upload failed (HTTP " + res.status + ")"
      );
    }
    showEtlLocalUploadSelected({
      file_name: data.file_name || file.name,
      source_object: data.source_object || data.upload_relative_path,
      absolute_path: data.absolute_path || "",
      ext: data.ext || (file.name.split(".").pop() || "").toLowerCase(),
      file_size: data.file_size != null ? data.file_size : file.size,
    });
    if ($("#etl_source_type")) $("#etl_source_type").value = "upload";
    updateEtlSourceKindUi();
    showEtlOk("Uploaded " + (data.file_name || file.name) + " → " + (data.source_object || ""));
  } catch (err) {
    clearEtlLocalUpload();
    showEtlError(
      "Local file upload failed: " +
        (err && err.message ? err.message : err) +
        ". Is the Connector API running on :5055?"
    );
  }
}

function bindEtlLocalUploadUi() {
  const zone = $("#etlUploadDropzone");
  const input = $("#etlUploadFileInput");
  const clearBtn = $("#etlUploadClearBtn");
  if (!zone || !input || zone.dataset.bound === "1") return;
  zone.dataset.bound = "1";
  zone.addEventListener("click", () => input.click());
  zone.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      input.click();
    }
  });
  input.addEventListener("change", (e) => uploadEtlLocalFile(e.target.files && e.target.files[0]));
  ["dragenter", "dragover"].forEach((ev) =>
    zone.addEventListener(ev, (e) => {
      e.preventDefault();
      zone.classList.add("dragover");
    })
  );
  ["dragleave", "drop"].forEach((ev) =>
    zone.addEventListener(ev, (e) => {
      e.preventDefault();
      zone.classList.remove("dragover");
    })
  );
  zone.addEventListener("drop", (e) => {
    const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    uploadEtlLocalFile(f);
  });
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      clearEtlLocalUpload();
      if ($("#etl_source_object")) $("#etl_source_object").value = "";
      showEtlOk("Local file cleared.");
    });
  }
}

async function loadEtlSnowflakeStages() {
  const sel = $("#etl_source_stage");
  if (!sel) return;
  const connectorId = etlSnowflakeConnectorId();
  if (!connectorId) {
    sel.disabled = true;
    sel.innerHTML = '<option value="">Select Snowflake connection first…</option>';
    return;
  }
  sel.disabled = true;
  sel.innerHTML = '<option value="">Loading stages…</option>';
  try {
    if (typeof DataHiveAssets === "undefined") throw new Error("Assets API not loaded");
    const data = await DataHiveAssets.snowflakeStages(connectorId);
    const items = data.items || [];
    if (!items.length) {
      sel.innerHTML = '<option value="SALES_DB.RAW.RAW_STAGE">SALES_DB.RAW.RAW_STAGE (example)</option>';
      sel.disabled = false;
      await loadEtlSnowflakeStageFiles();
      return;
    }
    sel.innerHTML =
      '<option value="">Select stage…</option>' +
      items
        .map((s) => {
          const label =
            s.fqn +
            (s.recommended ? " · recommended" : "") +
            (s.exists === false ? " · not created yet" : "");
          return (
            '<option value="' +
            escapeHtml(s.fqn) +
            '"' +
            (s.recommended ? " selected" : "") +
            ">" +
            escapeHtml(label) +
            "</option>"
          );
        })
        .join("");
    sel.disabled = false;
    if (!sel.value) {
      const rec = items.find((s) => s.recommended) || items[0];
      if (rec) sel.value = rec.fqn;
    }
    const help = $("#etl_stage_help");
    if (help) {
      const cur = items.find((s) => s.fqn === sel.value);
      help.textContent = cur && cur.note
        ? cur.note
        : "Files in this stage will be loaded into SALES_DB.RAW tables.";
    }
    await loadEtlSnowflakeStageFiles();
  } catch (err) {
    sel.innerHTML =
      '<option value="SALES_DB.RAW.RAW_STAGE">SALES_DB.RAW.RAW_STAGE (example)</option>';
    sel.disabled = false;
    showEtlError(
      "Could not list Snowflake stages: " + (err && err.message ? err.message : err)
    );
    await loadEtlSnowflakeStageFiles();
  }
}

async function loadEtlSnowflakeStageFiles() {
  const sel = $("#etl_source_file");
  if (!sel) return;
  const connectorId = etlSnowflakeConnectorId();
  const stageFqn = ($("#etl_source_stage") && $("#etl_source_stage").value) || "";
  if (!connectorId || !stageFqn) {
    sel.disabled = true;
    sel.innerHTML = '<option value="">Select a stage first…</option>';
    return;
  }
  sel.disabled = true;
  sel.innerHTML = '<option value="">Loading files…</option>';
  try {
    if (typeof DataHiveAssets === "undefined") throw new Error("Assets API not loaded");
    const data = await DataHiveAssets.snowflakeStageFiles(connectorId, stageFqn);
    const items = data.items || [];
    if (!items.length) {
      sel.innerHTML = '<option value="">No files visible for this role</option>';
      sel.disabled = true;
      const help = $("#etl_stage_help");
      if (help) {
        if (data.visible === false || data.exists === null) {
          help.textContent =
            (data.note ||
              "RAW_STAGE is not visible to connector role DATA_ENGINEER.") +
            " If it already exists in Snowflake UI, grant READ (do not recreate): " +
            "GRANT READ ON STAGE SALES_DB.RAW.RAW_STAGE TO ROLE DATA_ENGINEER;";
        } else if (data.note) {
          help.textContent = data.note;
        } else {
          help.textContent = "Stage is visible but empty for this role.";
        }
      }
      return;
    }
    sel.innerHTML =
      '<option value="">Select file…</option>' +
      items
        .map((f) => {
          const path = f.path || f.name;
          const size =
            f.size != null ? " · " + Number(f.size).toLocaleString() + " B" : "";
          return (
            '<option value="' +
            escapeHtml(path) +
            '" data-ext="' +
            escapeHtml(f.extension || "") +
            '">' +
            escapeHtml(path + size) +
            "</option>"
          );
        })
        .join("");
    sel.disabled = false;
  } catch (err) {
    sel.innerHTML = '<option value="">Failed to list stage files</option>';
    showEtlError(
      "Could not list stage files: " + (err && err.message ? err.message : err)
    );
  }
}

function applyEtlStageFileSelection() {
  const stageFqn = ($("#etl_source_stage") && $("#etl_source_stage").value) || "";
  const filePath = ($("#etl_source_file") && $("#etl_source_file").value) || "";
  if (!stageFqn || !filePath) return;
  if ($("#etl_source_object")) {
    $("#etl_source_object").value =
      "@" + stageFqn.replace(/^@/, "") + "/" + filePath.replace(/^\//, "");
  }
  if ($("#etl_target_object")) {
    $("#etl_target_object").value = "SALES_DB.RAW." + etlSuggestTableFromFile(filePath);
  }
  if ($("#etl_name") && !$("#etl_name").value.trim()) {
    $("#etl_name").value = "stage_" + etlSuggestTableFromFile(filePath).toLowerCase() + "_to_raw";
  }
}

function generateEtlTransformationScript() {
  const ctx = buildEtlScriptContext();
  if (!ctx.isLocalUpload && !ctx.sourceType) {
    showEtlError("Select a source connector before generating a script.");
    return null;
  }
  if (!ctx.targetType) {
    showEtlError("Select a destination connector before generating a script.");
    return null;
  }
  if (
    !ctx.isLocalUpload &&
    (!ctx.sourceConnKey || ctx.sourceConnKey === "__configure__")
  ) {
    showEtlError("Select a source connection before generating a script.");
    return null;
  }
  if (!ctx.targetConnKey || ctx.targetConnKey === "__configure__") {
    showEtlError("Select a destination connection before generating a script.");
    return null;
  }
  if (ctx.sourceKind === "local_file" || ctx.isLocalUpload) {
    if (!ctx.sourceObject && !(etlLocalUpload && etlLocalUpload.source_object)) {
      showEtlError("Upload a local file before generating a script.");
      return null;
    }
  }
  if (ctx.sourceKind === "stage_file") {
    if (ctx.sourceType !== "snowflake") {
      showEtlError("Snowflake stage file requires Source connector = Snowflake.");
      return null;
    }
    if (!ctx.stageFqn) {
      showEtlError("Select a Snowflake stage (e.g. SALES_DB.RAW.RAW_STAGE).");
      return null;
    }
    if (!ctx.stageFilePath) {
      showEtlError("Select a stage file to generate DDL and COPY INTO.");
      return null;
    }
  }
  if (ctx.sourceKind === "bigquery_table") {
    if (ctx.sourceType !== "gcp") {
      showEtlError("BigQuery table source requires Source connector = Google Cloud Platform.");
      return null;
    }
    if (!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(ctx.sourceObject)) {
      showEtlError(
        "Enter a BigQuery table as project.dataset.table (three parts)."
      );
      return null;
    }
  }
  if (ctx.sourceKind === "gcs_uri") {
    if (ctx.sourceType !== "gcp") {
      showEtlError("GCS URI source requires Source connector = Google Cloud Platform.");
      return null;
    }
    if (!etlIsGcsUri(ctx.sourceObject)) {
      showEtlError("Enter a GCS URI starting with gs://…");
      return null;
    }
  }
  if (ctx.targetKind === "bigquery_table") {
    if (ctx.targetType !== "gcp") {
      showEtlError("BigQuery table destination requires Target connector = Google Cloud Platform.");
      return null;
    }
    if (!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(ctx.targetObject)) {
      showEtlError(
        "Enter the destination BigQuery table as project.dataset.table."
      );
      return null;
    }
  }
  if (ctx.targetKind === "gcs_uri") {
    if (ctx.targetType !== "gcp") {
      showEtlError("GCS URI destination requires Target connector = Google Cloud Platform.");
      return null;
    }
    if (!etlIsGcsUri(ctx.targetObject)) {
      showEtlError("Enter a destination GCS URI starting with gs://…");
      return null;
    }
  }
  let script = "";
  let languageLabel = ctx.language.toUpperCase();
  if (ctx.sourceKind === "local_file" || ctx.isLocalUpload) {
    if (ctx.language === "sql") {
      script = generateLocalFileEtlSql(ctx);
      languageLabel = "SQL · local file notes (use Python to load)";
    } else {
      script = generateLocalFileEtlPython(ctx);
      languageLabel =
        etlIsJsonFileExt(ctx.localFileExt || etlUriFileExt(ctx.sourceObject))
          ? "PYTHON · local JSON flatten → tabular"
          : "PYTHON · local file → tabular";
    }
  } else if (ctx.sourceKind === "stage_file" || ctx.isStageIngest) {
    const jsonStage = etlIsJsonFileExt(etlStageResolveExt(ctx));
    // Native Snowflake DDL + COPY for CSV/Parquet; nested JSON is flattened to tabular RAW.
    if (ctx.language === "sql") {
      script = generateEtlSqlScript(ctx);
      languageLabel = jsonStage
        ? "SQL · JSON flatten → tabular"
        : "SQL · Snowflake COPY";
    } else {
      script = generateSnowflakeStageIngestPython(ctx, {
        viaLabel:
          ctx.language === "pyspark"
            ? "Python · Snowflake COPY (not PySpark)"
            : "Python",
      });
      if (jsonStage) {
        languageLabel =
          ctx.language === "pyspark"
            ? "PYTHON · JSON flatten (PySpark not used)"
            : "PYTHON · JSON flatten → tabular";
      } else {
        languageLabel =
          ctx.language === "pyspark"
            ? "PYTHON · Snowflake COPY (PySpark not used)"
            : "PYTHON · Snowflake COPY";
      }
    }
  } else if (etlIsGcsJsonSource(ctx)) {
    if (ctx.language === "sql") {
      script = generateGcsJsonFlattenSql(ctx);
      languageLabel = "SQL · GCS JSON → BigQuery";
    } else {
      script = generateGcsJsonFlattenPython(ctx);
      languageLabel =
        ctx.language === "pyspark"
          ? "PYTHON · GCS JSON flatten (PySpark not used)"
          : "PYTHON · GCS JSON flatten → tabular";
    }
  } else if (ctx.language === "python") {
    script = generateEtlPythonScript(ctx);
  } else if (ctx.language === "pyspark") {
    script = generateEtlPySparkScript(ctx);
  } else {
    script = generateEtlSqlScript(ctx);
  }

  etlGeneratedScript = script;
  const editor = $("#etlScriptEditor");
  if (editor) editor.value = script;
  const hint = $("#etlScriptHint");
  if (hint) {
    hint.textContent =
      etlPlatformLabel(ctx.sourceType) +
      " → " +
      etlPlatformLabel(ctx.targetType) +
      " · " +
      languageLabel;
  }
  const meta = $("#etlScriptMeta");
  if (meta) {
    meta.textContent =
      "Generated for " +
      ctx.sourceObject +
      " → " +
      ctx.targetObject +
      " (" +
      script.split("\n").length +
      " lines). Edit freely before saving.";
  }
  const err = $("#etlFormError");
  if (err) err.classList.add("hidden");
  return { ctx, script };
}

function loadEtlPipelines() {
  try {
    const raw = localStorage.getItem(ETL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (_) { /* ignore */ }
  return [];
}

function saveEtlPipelines() {
  localStorage.setItem(ETL_STORAGE_KEY, JSON.stringify(etlPipelines));
}

function fillEtlConnectorSelects() {
  const all = etlConnectorOptions();
  const srcOpts =
    '<option value="">Select source connector…</option>' +
    all
      .map((c) =>
        '<option value="' + escapeHtml(c.id) + '">' + escapeHtml(c.name) + "</option>"
      )
      .join("");
  const tgtOpts =
    '<option value="">Select target connector…</option>' +
    all
      .filter((c) => c.id !== "upload")
      .map((c) =>
        '<option value="' + escapeHtml(c.id) + '">' + escapeHtml(c.name) + "</option>"
      )
      .join("");
  const src = $("#etl_source_type");
  const tgt = $("#etl_target_type");
  if (src) {
    const prev = src.value;
    src.innerHTML = srcOpts;
    if (prev) src.value = prev;
  }
  if (tgt) {
    const prev = tgt.value;
    tgt.innerHTML = tgtOpts;
    if (prev) tgt.value = prev;
  }
}

function connectionLabel(conn) {
  const name = conn.display_name || conn.account_id || "Untitled";
  const region = conn.region ? " · " + conn.region : "";
  const account = conn.account_id && conn.account_id !== conn.display_name
    ? " (" + conn.account_id + ")"
    : "";
  return name + account + region;
}

function fillEtlConnectionSelect(selectEl, cloudId, selectedValue) {
  if (!selectEl) return;
  if (!cloudId) {
    selectEl.disabled = true;
    selectEl.innerHTML = '<option value="">Select a connector first…</option>';
    return;
  }
  let matches = etlConnections.filter((c) =>
    c.cloud === cloudId || c.connector_type === (CLOUDS[cloudId] && CLOUDS[cloudId].type)
  );
  if (cloudId === "postgres") {
    matches = [
      {
        id: "local-postgres",
        cloud: "postgres",
        display_name: "Local Postgres",
        region: "localhost",
        account_id: "datahivepoc",
      },
    ].concat(matches);
  }
  if (!matches.length) {
    selectEl.disabled = false;
    selectEl.innerHTML =
      '<option value="">No saved connections for this connector</option>' +
      '<option value="__configure__">Configure in Connectors…</option>';
    return;
  }
  selectEl.disabled = false;
  selectEl.innerHTML =
    '<option value="">Select connection…</option>' +
    matches.map((c) => {
      const key = c.id || (c.cloud + "|" + c.display_name + "|" + (c.saved_at || ""));
      return (
        '<option value="' + escapeHtml(key) + '"' +
        (selectedValue === key ? " selected" : "") + ">" +
        escapeHtml(connectionLabel(c)) + "</option>"
      );
    }).join("");
}

function findEtlConnection(key) {
  if (!key) return null;
  if (key === "local-postgres") {
    return {
      id: "local-postgres",
      cloud: "postgres",
      display_name: "Local Postgres",
      region: "localhost",
      account_id: "datahivepoc",
    };
  }
  return etlConnections.find((c) => {
    const id = c.id || (c.cloud + "|" + c.display_name + "|" + (c.saved_at || ""));
    return id === key;
  }) || null;
}

async function refreshEtlConnections() {
  etlConnections = [];
  if (typeof fetchRecentConnectors === "function") {
    try {
      const data = await fetchRecentConnectors(50);
      etlConnections = (data && data.items) || [];
    } catch (_) {
      etlConnections = [];
    }
  }
  // Also include session-local recently saved connectors if present.
  try {
    const local = JSON.parse(localStorage.getItem("datahive.recentConnectors") || "[]");
    if (Array.isArray(local)) {
      local.forEach((c) => {
        const key = c.id || (c.cloud + "|" + c.display_name + "|" + (c.saved_at || ""));
        if (!findEtlConnection(key)) etlConnections.push(c);
      });
    }
  } catch (_) { /* ignore */ }

  fillEtlConnectionSelect($("#etl_source_conn"), $("#etl_source_type").value, $("#etl_source_conn").value);
  fillEtlConnectionSelect($("#etl_target_conn"), $("#etl_target_type").value, $("#etl_target_conn").value);
}

function showEtlError(msg) {
  const err = $("#etlFormError");
  const ok = $("#etlFormOk");
  if (ok) { ok.classList.add("hidden"); ok.textContent = ""; }
  if (err) { err.textContent = msg; err.classList.remove("hidden"); }
}

function showEtlOk(msg) {
  const err = $("#etlFormError");
  const ok = $("#etlFormOk");
  if (err) { err.classList.add("hidden"); err.textContent = ""; }
  if (ok) { ok.textContent = msg; ok.classList.remove("hidden"); }
}

function resetEtlForm() {
  const form = $("#etlForm");
  if (form) form.reset();
  if ($("#etl_language")) $("#etl_language").value = "sql";
  if ($("#etl_source_kind")) $("#etl_source_kind").value = "object";
  fillEtlConnectionSelect($("#etl_source_conn"), "", "");
  fillEtlConnectionSelect($("#etl_target_conn"), "", "");
  if ($("#etl_source_object")) $("#etl_source_object").value = "";
  if ($("#etl_target_object")) $("#etl_target_object").value = "";
  if ($("#etl_source_stage")) {
    $("#etl_source_stage").disabled = true;
    $("#etl_source_stage").innerHTML = '<option value="">Select Snowflake connection first…</option>';
  }
  if ($("#etl_source_file")) {
    $("#etl_source_file").disabled = true;
    $("#etl_source_file").innerHTML = '<option value="">Select a stage first…</option>';
  }
  clearEtlLocalUpload();
  updateEtlSourceKindUi();
  etlGeneratedScript = "";
  if ($("#etlScriptEditor")) $("#etlScriptEditor").value = "";
  if ($("#etlScriptHint")) {
    $("#etlScriptHint").textContent =
      "Select source, destination, and language, then generate.";
  }
  if ($("#etlScriptMeta")) $("#etlScriptMeta").textContent = "";
  const err = $("#etlFormError");
  const ok = $("#etlFormOk");
  if (err) err.classList.add("hidden");
  if (ok) ok.classList.add("hidden");
}

function renderEtlPipelines() {
  const body = $("#etlPipelinesBody");
  const count = $("#etlPipelineCount");
  if (count) count.textContent = String(etlPipelines.length);
  if (!body) return;
  if (!etlPipelines.length) {
    body.innerHTML =
      '<div class="admin-empty">No pipelines yet. Select source and destination, generate a script, then save.</div>';
    return;
  }
  body.innerHTML =
    '<table class="admin-table" aria-label="Saved pipelines">' +
    "<thead><tr><th>Pipeline</th><th>Source</th><th>Destination</th><th>Language</th><th>Updated</th><th></th></tr></thead><tbody>" +
    etlPipelines.map((p) => {
      const srcCloud = CLOUDS[p.source_type] || { short: etlPlatformLabel(p.source_type) };
      const tgtCloud = CLOUDS[p.target_type] || { short: etlPlatformLabel(p.target_type) };
      const updated = p.updated_at ? new Date(p.updated_at).toLocaleString() : "—";
      const lang = (p.language || "sql").toUpperCase();
      return (
        "<tr>" +
        '<td><div class="nm">' + escapeHtml(p.name) + "</div>" +
        (p.notes ? '<div class="muted">' + escapeHtml(p.notes) + "</div>" : "") +
        "</td>" +
        "<td><div class=\"nm\">" + escapeHtml(srcCloud.short || p.source_type) + "</div>" +
        '<div class="muted">' + escapeHtml(p.source_label || "—") + "</div>" +
        (p.source_object ? '<div class="muted">' + escapeHtml(p.source_object) + "</div>" : "") +
        "</td>" +
        "<td><div class=\"nm\">" + escapeHtml(tgtCloud.short || p.target_type) + "</div>" +
        '<div class="muted">' + escapeHtml(p.target_label || "—") + "</div>" +
        (p.target_object ? '<div class="muted">' + escapeHtml(p.target_object) + "</div>" : "") +
        "</td>" +
        "<td>" + escapeHtml(lang) + "</td>" +
        "<td>" + escapeHtml(updated) + "</td>" +
        '<td><div class="admin-actions">' +
        (p.script
          ? '<button type="button" class="btn-sm" data-etl-open="' + escapeHtml(p.id) + '">Script</button>'
          : "") +
        '<button type="button" class="btn-sm danger" data-etl-del="' + escapeHtml(p.id) + '">Delete</button>' +
        "</div></td></tr>"
      );
    }).join("") +
    "</tbody></table>";
}

function bindEtlEvents() {
  if (etlBound) return;
  etlBound = true;

  $("#etl_source_type").addEventListener("change", (e) => {
    fillEtlConnectionSelect($("#etl_source_conn"), e.target.value, "");
    // Reset kind options for the new platform (e.g. GCP → BigQuery + GCS).
    updateEtlSourceKindUi("");
    if ($("#etl_source_object") && !$("#etl_source_object").value.trim()) {
      const sk = ($("#etl_source_kind") && $("#etl_source_kind").value) || "object";
      $("#etl_source_object").placeholder = etlDefaultObject("source", e.target.value, sk);
    }
    if (e.target.value === "snowflake" && $("#etl_source_kind") && $("#etl_source_kind").value === "stage_file") {
      loadEtlSnowflakeStages();
    }
  });
  $("#etl_target_type").addEventListener("change", (e) => {
    fillEtlConnectionSelect($("#etl_target_conn"), e.target.value, "");
    updateEtlTargetKindUi("");
    if ($("#etl_target_object") && !$("#etl_target_object").value.trim()) {
      const tk = ($("#etl_target_kind") && $("#etl_target_kind").value) || "object";
      $("#etl_target_object").placeholder = etlDefaultObject("target", e.target.value, tk);
    }
  });

  bindEtlLocalUploadUi();

  const sourceKind = $("#etl_source_kind");
  if (sourceKind) {
    sourceKind.addEventListener("change", () => {
      const sk = sourceKind.value;
      const langHelp = $("#etl_language_help");
      if (sk === "local_file") {
        if ($("#etl_source_type") && !$("#etl_source_type").value) {
          $("#etl_source_type").value = "upload";
        }
        if ($("#etl_language") && $("#etl_language").value === "sql") {
          $("#etl_language").value = "python";
        }
        if (langHelp) {
          langHelp.textContent =
            "Local uploads use Python to load (JSON is flattened to tabular columns).";
        }
      } else if (sk === "stage_file") {
        if ($("#etl_source_type")) $("#etl_source_type").value = "snowflake";
        fillEtlConnectionSelect($("#etl_source_conn"), "snowflake", "");
        loadEtlSnowflakeStages();
        if ($("#etl_language") && $("#etl_language").value === "pyspark") {
          $("#etl_language").value = "sql";
        }
        if (langHelp) {
          langHelp.textContent =
            "Stage → RAW always generates Snowflake DDL + COPY INTO. PySpark is not used.";
        }
      } else if (sk === "bigquery_table") {
        if ($("#etl_source_type") && $("#etl_source_type").value !== "gcp") {
          $("#etl_source_type").value = "gcp";
          fillEtlConnectionSelect($("#etl_source_conn"), "gcp", "");
        }
        if (langHelp) {
          langHelp.textContent =
            "BigQuery table sources use the BigQuery SQL dialect (or PySpark bigquery format).";
        }
      } else if (sk === "gcs_uri") {
        if ($("#etl_source_type") && $("#etl_source_type").value !== "gcp") {
          $("#etl_source_type").value = "gcp";
          fillEtlConnectionSelect($("#etl_source_conn"), "gcp", "");
        }
        if ($("#etl_language") && $("#etl_language").value === "sql") {
          $("#etl_language").value = "python";
        }
        if (langHelp) {
          langHelp.textContent =
            "GCS gs://… JSON sources are flattened with Python (recommended) or PySpark.";
        }
      } else if (langHelp) {
        langHelp.textContent =
          "Snowflake stage → COPY INTO. BigQuery table → BQ SQL. GCS / local upload → flatten with Python.";
      }
      updateEtlSourceKindUi(sk);
      const srcType = ($("#etl_source_type") && $("#etl_source_type").value) || "";
      if ($("#etl_source_object") && !$("#etl_source_object").value.trim()) {
        $("#etl_source_object").placeholder = etlDefaultObject("source", srcType, sk);
      }
    });
  }
  const targetKind = $("#etl_target_kind");
  if (targetKind) {
    targetKind.addEventListener("change", () => {
      const tk = targetKind.value;
      const tgtType = ($("#etl_target_type") && $("#etl_target_type").value) || "";
      if ((tk === "bigquery_table" || tk === "gcs_uri") && tgtType !== "gcp") {
        if ($("#etl_target_type")) {
          $("#etl_target_type").value = "gcp";
          fillEtlConnectionSelect($("#etl_target_conn"), "gcp", "");
        }
      }
      updateEtlTargetKindUi(tk);
      if ($("#etl_target_object") && !$("#etl_target_object").value.trim()) {
        $("#etl_target_object").placeholder = etlDefaultObject(
          "target",
          ($("#etl_target_type") && $("#etl_target_type").value) || "",
          tk
        );
      }
    });
  }
  const stageSel = $("#etl_source_stage");
  if (stageSel) {
    stageSel.addEventListener("change", () => loadEtlSnowflakeStageFiles());
  }
  const fileSel = $("#etl_source_file");
  if (fileSel) {
    fileSel.addEventListener("change", () => applyEtlStageFileSelection());
  }
  const refreshBtn = $("#etlRefreshStageBtn");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", () => {
      loadEtlSnowflakeStages();
    });
  }
  const ensureBtn = $("#etlEnsureStageBtn");
  if (ensureBtn) {
    ensureBtn.addEventListener("click", async () => {
      const connectorId = etlSnowflakeConnectorId();
      if (!connectorId) {
        showEtlError("Select a Snowflake source connection first.");
        return;
      }
      ensureBtn.disabled = true;
      ensureBtn.textContent = "Creating…";
      try {
        if (typeof DataHiveAssets === "undefined") throw new Error("Assets API not loaded");
        const result = await DataHiveAssets.snowflakeEnsureRawStage(connectorId);
        showEtlOk("Stage ready: " + (result.fqn || "RAW_STAGE"));
        await loadEtlSnowflakeStages();
      } catch (err) {
        const detail = err && err.detail;
        let msg = "";
        if (detail && typeof detail === "object" && detail.message) {
          msg =
            detail.message +
            (detail.workaround ? "\n\nWorkaround: " + detail.workaround : "");
        } else {
          const raw = err && err.message ? err.message : String(err);
          try {
            const parsed = JSON.parse(raw);
            if (parsed && parsed.message) {
              msg =
                parsed.message +
                (parsed.workaround ? "\n\nWorkaround: " + parsed.workaround : "");
            }
          } catch (_e) {
            /* keep raw */
          }
          if (!msg) {
            if (/CREATE (STAGE|FILE FORMAT|TABLE)|Insufficient privileges/i.test(raw)) {
              msg =
                "Connector role can USE SALES_DB.RAW but lacks create privileges for ETL.\n\n" +
                "Ask ACCOUNTADMIN to run:\n" +
                "USE ROLE ACCOUNTADMIN;\n" +
                "GRANT USAGE ON DATABASE SALES_DB TO ROLE DEV_ADMIN_ROLE;\n" +
                "GRANT USAGE ON SCHEMA SALES_DB.RAW TO ROLE DEV_ADMIN_ROLE;\n" +
                "GRANT CREATE TABLE, CREATE FILE FORMAT, CREATE STAGE ON SCHEMA SALES_DB.RAW TO ROLE DEV_ADMIN_ROLE;\n" +
                "GRANT READ, WRITE ON STAGE SALES_DB.RAW.RAW_STAGE TO ROLE DEV_ADMIN_ROLE;";
            } else {
              msg = "Could not ensure RAW_STAGE: " + raw;
            }
          }
        }
        showEtlError(msg);
      } finally {
        ensureBtn.disabled = false;
        ensureBtn.textContent = "Ensure";
      }
    });
  }

  $("#etl_source_conn").addEventListener("change", (e) => {
    if (e.target.value === "__configure__") {
      e.target.value = "";
      document.querySelector('nav.rail a[data-view="connectors"]').click();
      return;
    }
    updateEtlSourceKindUi();
    if ($("#etl_source_kind") && $("#etl_source_kind").value === "stage_file") {
      loadEtlSnowflakeStages();
    }
    // Refresh BigQuery placeholders with the connector's project id when possible.
    const sk = ($("#etl_source_kind") && $("#etl_source_kind").value) || "";
    if (sk === "bigquery_table" && $("#etl_source_object") && !$("#etl_source_object").value.trim()) {
      $("#etl_source_object").placeholder = etlDefaultObject("source", "gcp", "bigquery_table");
    }
  });
  $("#etl_target_conn").addEventListener("change", (e) => {
    if (e.target.value === "__configure__") {
      e.target.value = "";
      document.querySelector('nav.rail a[data-view="connectors"]').click();
      return;
    }
    updateEtlTargetKindUi();
    const tk = ($("#etl_target_kind") && $("#etl_target_kind").value) || "";
    if (tk === "bigquery_table" && $("#etl_target_object") && !$("#etl_target_object").value.trim()) {
      $("#etl_target_object").placeholder = etlDefaultObject("target", "gcp", "bigquery_table");
    }
  });

  const langSel = $("#etl_language");
  if (langSel) {
    langSel.addEventListener("change", () => {
      if (etlGeneratedScript) generateEtlTransformationScript();
    });
  }

  const genBtn = $("#etlGenerateBtn");
  if (genBtn) {
    genBtn.addEventListener("click", () => {
      const result = generateEtlTransformationScript();
      if (result) showEtlOk("Transformation script generated (" + result.ctx.language.toUpperCase() + ").");
    });
  }

  const copyBtn = $("#etlCopyScriptBtn");
  if (copyBtn) {
    copyBtn.addEventListener("click", async () => {
      const text = ($("#etlScriptEditor") && $("#etlScriptEditor").value) || "";
      if (!text.trim()) return showEtlError("Generate a script before copying.");
      try {
        await navigator.clipboard.writeText(text);
        showEtlOk("Script copied to clipboard.");
      } catch (_err) {
        $("#etlScriptEditor").select();
        document.execCommand("copy");
        showEtlOk("Script copied to clipboard.");
      }
    });
  }

  const dlBtn = $("#etlDownloadScriptBtn");
  if (dlBtn) {
    dlBtn.addEventListener("click", () => {
      const text = ($("#etlScriptEditor") && $("#etlScriptEditor").value) || "";
      if (!text.trim()) return showEtlError("Generate a script before downloading.");
      const lang = selectedEtlLanguage();
      const ext = lang === "sql" ? "sql" : "py";
      const name = (($("#etl_name").value || "pipeline").trim() || "pipeline")
        .replace(/[^\w\-]+/g, "_")
        .toLowerCase();
      const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name + "." + ext;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showEtlOk("Downloaded " + name + "." + ext);
    });
  }

  $("#etlResetBtn").addEventListener("click", resetEtlForm);

  $("#etlForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const name = ($("#etl_name").value || "").trim();
    const sourceType = $("#etl_source_type").value;
    const targetType = $("#etl_target_type").value;
    const sourceConnKey = $("#etl_source_conn").value;
    const targetConnKey = $("#etl_target_conn").value;
    const notes = ($("#etl_notes").value || "").trim();
    const language = selectedEtlLanguage();
    const sourceObject =
      ($("#etl_source_object").value || "").trim() || etlDefaultObject("source", sourceType);
    const targetObject =
      ($("#etl_target_object").value || "").trim() || etlDefaultObject("target", targetType);

    const sourceKindVal = ($("#etl_source_kind") && $("#etl_source_kind").value) || "object";
    const localUploadMode = sourceKindVal === "local_file";

    if (!name) return showEtlError("Pipeline name is required.");
    if (!localUploadMode && !sourceType) return showEtlError("Select a source connector.");
    if (!targetType) return showEtlError("Select a destination connector.");
    if (localUploadMode && !(etlLocalUpload && etlLocalUpload.source_object) && !sourceObject) {
      return showEtlError("Upload a local file before saving the pipeline.");
    }
    if (!localUploadMode && (!sourceConnKey || sourceConnKey === "__configure__")) {
      return showEtlError("Select a source connection. Save one under Connectors if the list is empty.");
    }
    if (!targetConnKey || targetConnKey === "__configure__") {
      return showEtlError("Select a destination connection. Save one under Connectors if the list is empty.");
    }
    if (!localUploadMode && sourceConnKey === targetConnKey) {
      return showEtlError("Source and destination connections must be different.");
    }

    let script = ($("#etlScriptEditor") && $("#etlScriptEditor").value) || etlGeneratedScript;
    if (!script || !script.trim()) {
      const generated = generateEtlTransformationScript();
      if (!generated) return;
      script = generated.script;
    }

    const srcConn = findEtlConnection(sourceConnKey);
    const tgtConn = findEtlConnection(targetConnKey);
    const now = new Date().toISOString();
    const resolvedSourceObject =
      (localUploadMode && etlLocalUpload && etlLocalUpload.source_object) || sourceObject;
    etlPipelines.unshift({
      id: "etl-" + Math.random().toString(36).slice(2, 9),
      name,
      source_type: localUploadMode ? "upload" : sourceType,
      target_type: targetType,
      source_conn_id: localUploadMode ? "__local_file__" : sourceConnKey,
      target_conn_id: targetConnKey,
      source_label: localUploadMode
        ? (etlLocalUpload && etlLocalUpload.file_name) || "Local file"
        : srcConn
          ? connectionLabel(srcConn)
          : sourceConnKey,
      target_label: tgtConn ? connectionLabel(tgtConn) : targetConnKey,
      source_object: resolvedSourceObject,
      target_object: targetObject,
      source_kind: sourceKindVal,
      target_kind: ($("#etl_target_kind") && $("#etl_target_kind").value) || "object",
      language,
      script,
      notes,
      created_at: now,
      updated_at: now
    });
    saveEtlPipelines();
    renderEtlPipelines();
    showEtlOk("Pipeline \"" + name + "\" saved with " + language.toUpperCase() + " script.");
  });

  $("#etlPipelinesBody").addEventListener("click", (e) => {
    const open = e.target.closest("[data-etl-open]");
    if (open) {
      const id = open.dataset.etlOpen;
      const p = etlPipelines.find((x) => x.id === id);
      if (!p || !p.script) return;
      etlGeneratedScript = p.script;
      if ($("#etlScriptEditor")) $("#etlScriptEditor").value = p.script;
      if ($("#etl_name")) $("#etl_name").value = p.name || "";
      if ($("#etl_source_type")) {
        $("#etl_source_type").value = p.source_type || "";
        fillEtlConnectionSelect($("#etl_source_conn"), p.source_type || "", p.source_conn_id || "");
      }
      if ($("#etl_target_type")) {
        $("#etl_target_type").value = p.target_type || "";
        fillEtlConnectionSelect($("#etl_target_conn"), p.target_type || "", p.target_conn_id || "");
      }
      rebuildEtlKindSelect(
        $("#etl_source_kind"),
        p.source_type || "",
        "source",
        p.source_kind || ""
      );
      rebuildEtlKindSelect(
        $("#etl_target_kind"),
        p.target_type || "",
        "target",
        p.target_kind || ""
      );
      updateEtlSourceKindUi();
      updateEtlTargetKindUi(p.target_kind || "");
      if ($("#etl_source_object")) $("#etl_source_object").value = p.source_object || "";
      if ($("#etl_target_object")) $("#etl_target_object").value = p.target_object || "";
      if ($("#etl_notes")) $("#etl_notes").value = p.notes || "";
      if ($("#etl_language")) $("#etl_language").value = p.language || "sql";
      if ($("#etlScriptHint")) {
        $("#etlScriptHint").textContent =
          etlPlatformLabel(p.source_type) +
          " → " +
          etlPlatformLabel(p.target_type) +
          " · " +
          String(p.language || "sql").toUpperCase();
      }
      if ($("#etlScriptMeta")) {
        $("#etlScriptMeta").textContent = "Loaded saved script for \"" + p.name + "\".";
      }
      showEtlOk("Loaded script for \"" + p.name + "\".");
      $("#etlScriptEditor").scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    const del = e.target.closest("[data-etl-del]");
    if (!del) return;
    const id = del.dataset.etlDel;
    const p = etlPipelines.find((x) => x.id === id);
    if (!p) return;
    if (!confirm('Delete pipeline "' + p.name + '"?')) return;
    etlPipelines = etlPipelines.filter((x) => x.id !== id);
    saveEtlPipelines();
    renderEtlPipelines();
  });
}

async function initEtlView() {
  etlPipelines = loadEtlPipelines();
  fillEtlConnectorSelects();
  bindEtlEvents();
  await refreshEtlConnections();
  updateEtlSourceKindUi();
  updateEtlTargetKindUi();
  renderEtlPipelines();
}

/* ========== Glossary: template download + upload ========== */
let glossarySelectedFile = null;
let glossaryBound = false;

function glossaryApiBase() {
  if (window.DATAHIVE_CONNECTOR_API) {
    return String(window.DATAHIVE_CONNECTOR_API).replace(/\/$/, "");
  }
  const host = (window.location && window.location.hostname) || "127.0.0.1";
  return "http://" + host + ":5055";
}

function showGlossaryError(msg) {
  const err = $("#glossaryFormError");
  const ok = $("#glossaryFormOk");
  if (ok) { ok.classList.add("hidden"); ok.textContent = ""; }
  if (err) { err.textContent = msg; err.classList.remove("hidden"); }
}

function showGlossaryOk(msg) {
  const err = $("#glossaryFormError");
  const ok = $("#glossaryFormOk");
  if (err) { err.classList.add("hidden"); err.textContent = ""; }
  if (ok) { ok.textContent = msg; ok.classList.remove("hidden"); }
}

function clearGlossarySelection() {
  glossarySelectedFile = null;
  const input = $("#glossaryFileInput");
  if (input) input.value = "";
  const box = $("#glossarySelected");
  if (box) box.classList.add("hidden");
}

function selectGlossaryFile(file) {
  if (!file) return;
  const name = String(file.name || "").toLowerCase();
  if (!/\.(xlsx|xls|csv)$/.test(name)) {
    showGlossaryError("Please choose an Excel (.xlsx, .xls) or CSV file.");
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    showGlossaryError("File exceeds the 10 MB limit.");
    return;
  }
  glossarySelectedFile = file;
  $("#glossarySelectedName").textContent = file.name;
  $("#glossarySelectedSize").textContent = formatBytes(file.size);
  $("#glossarySelected").classList.remove("hidden");
  const err = $("#glossaryFormError");
  if (err) err.classList.add("hidden");
}

function renderGlossaryList(items) {
  const body = $("#glossaryListBody");
  const count = $("#glossaryCount");
  const list = items || [];
  if (count) count.textContent = String(list.length);
  if (!body) return;
  if (!list.length) {
    body.innerHTML = '<div class="admin-empty">No glossaries uploaded yet. Download the template, update it, then upload here.</div>';
    return;
  }
  body.innerHTML =
    '<table class="admin-table" aria-label="Uploaded glossaries">' +
    "<thead><tr><th>File</th><th>Rows</th><th>Registry</th><th>Platforms</th><th>Failed</th><th>Uploaded by</th><th>Saved at</th><th></th></tr></thead><tbody>" +
    list.map((g) => {
      const saved = g.saved_at ? new Date(g.saved_at).toLocaleString() : "—";
      const apply = g.apply || {};
      const rows = apply.rows_total != null ? String(apply.rows_total) : (g.term_count != null ? String(g.term_count) : "—");
      const updated = apply.registry_updated != null
        ? String(apply.registry_updated)
        : (apply.updated != null ? String(apply.updated) : "—");
      const platforms = Array.isArray(apply.platforms) && apply.platforms.length
        ? apply.platforms.join(", ")
        : "—";
      const failed = apply.failed != null ? String(apply.failed) : "—";
      const dl = g.stored_file_name
        ? glossaryApiBase() + "/api/glossary/files/" + encodeURIComponent(g.stored_file_name)
        : "";
      return (
        "<tr>" +
        '<td><div class="nm">' + escapeHtml(g.file_name || "glossary") + "</div>" +
        (g.notes ? '<div class="muted">' + escapeHtml(g.notes) + "</div>" : "") +
        "</td>" +
        "<td>" + escapeHtml(rows) + "</td>" +
        "<td>" + escapeHtml(updated) + "</td>" +
        "<td>" + escapeHtml(platforms) + "</td>" +
        "<td>" + escapeHtml(failed) + "</td>" +
        "<td>" + escapeHtml(g.user || "—") + "</td>" +
        "<td>" + escapeHtml(saved) + "</td>" +
        '<td><div class="admin-actions">' +
        (dl
          ? '<a class="btn-sm" href="' + escapeHtml(dl) + '" download>Download</a>'
          : "") +
        "</div></td></tr>"
      );
    }).join("") +
    "</tbody></table>";
}

function renderGlossaryTerms(items) {
  const body = $("#glossaryTermsBody");
  const count = $("#glossaryTermsCount");
  const list = items || [];
  if (count) count.textContent = String(list.length);
  if (!body) return;
  if (!list.length) {
    body.innerHTML = '<div class="admin-empty">No registered terms yet. Upload a glossary to populate asset_glossary across connectors.</div>';
    return;
  }
  body.innerHTML =
    '<table class="admin-table" aria-label="Registered glossary terms">' +
    "<thead><tr><th>Platform</th><th>Connection</th><th>Asset</th><th>Business name</th><th>Classification</th><th>Updated</th></tr></thead><tbody>" +
    list.map((t) => {
      const asset = [t.database, t.schema, t.table, t.column].filter(Boolean).join(".");
      const updated = t.updated_at ? new Date(t.updated_at).toLocaleString() : "—";
      return (
        "<tr>" +
        "<td>" + escapeHtml(t.platform || "—") + "</td>" +
        "<td>" + escapeHtml(t.connection || "—") + "</td>" +
        '<td><div class="nm">' + escapeHtml(asset || "—") + "</div></td>" +
        "<td>" + escapeHtml(t.business_name || "—") + "</td>" +
        "<td>" + escapeHtml(t.classification || "—") + "</td>" +
        "<td>" + escapeHtml(updated) + "</td>" +
        "</tr>"
      );
    }).join("") +
    "</tbody></table>";
}

async function refreshGlossaryList() {
  const body = $("#glossaryListBody");
  const count = $("#glossaryCount");
  if (body) body.innerHTML = '<div class="admin-empty">Loading uploaded glossaries…</div>';
  try {
    const res = await fetch(glossaryApiBase() + "/api/glossary/recent?limit=20", {
      headers: { "X-DataHive-User": ($("#userNm") && $("#userNm").textContent.trim()) || "Admin" },
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error((data && data.detail) || ("HTTP " + res.status));
    }
    renderGlossaryList((data && data.items) || []);
  } catch (err) {
    if (body) {
      body.innerHTML =
        '<div class="admin-empty">Could not load uploads. ' +
        escapeHtml(err && err.message ? err.message : String(err)) +
        "</div>";
    }
    if (count) count.textContent = "0";
  }
}

async function refreshGlossaryTerms() {
  const body = $("#glossaryTermsBody");
  const count = $("#glossaryTermsCount");
  if (body) body.innerHTML = '<div class="admin-empty">Loading registered terms…</div>';
  try {
    const res = await fetch(glossaryApiBase() + "/api/glossary/terms?limit=50", {
      headers: { "X-DataHive-User": ($("#userNm") && $("#userNm").textContent.trim()) || "Admin" },
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error((data && data.detail) || ("HTTP " + res.status));
    }
    renderGlossaryTerms((data && data.items) || []);
  } catch (err) {
    if (body) {
      body.innerHTML =
        '<div class="admin-empty">Could not load terms. ' +
        escapeHtml(err && err.message ? err.message : String(err)) +
        "</div>";
    }
    if (count) count.textContent = "0";
  }
}

function bindGlossaryEvents() {
  if (glossaryBound) return;
  glossaryBound = true;

  const downloadBtn = $("#glossaryDownloadBtn");
  if (downloadBtn) {
    downloadBtn.addEventListener("click", (e) => {
      e.preventDefault();
      window.location.href = glossaryApiBase() + "/api/glossary/template";
    });
  }

  const drop = $("#glossaryDropzone");
  const input = $("#glossaryFileInput");
  if (drop && input) {
    drop.addEventListener("click", () => input.click());
    drop.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        input.click();
      }
    });
    input.addEventListener("change", (e) => selectGlossaryFile(e.target.files && e.target.files[0]));
    ["dragover", "dragenter"].forEach((evt) => {
      drop.addEventListener(evt, (e) => {
        e.preventDefault();
        drop.classList.add("dragover");
      });
    });
    ["dragleave", "drop"].forEach((evt) => {
      drop.addEventListener(evt, (e) => {
        e.preventDefault();
        drop.classList.remove("dragover");
      });
    });
    drop.addEventListener("drop", (e) => {
      const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      selectGlossaryFile(file);
    });
  }

  const clearBtn = $("#glossaryClearBtn");
  if (clearBtn) clearBtn.addEventListener("click", clearGlossarySelection);

  const uploadBtn = $("#glossaryUploadBtn");
  if (uploadBtn) {
    uploadBtn.addEventListener("click", async () => {
      if (!glossarySelectedFile) return showGlossaryError("Select a glossary file first.");
      uploadBtn.disabled = true;
      uploadBtn.textContent = "Uploading…";
      try {
        if (typeof ensureDataHiveConnectorApi === "function") {
          const ok = await ensureDataHiveConnectorApi();
          if (!ok) throw new Error("Connector API is not reachable.");
        }
        const fd = new FormData();
        fd.append("file", glossarySelectedFile, glossarySelectedFile.name);
        fd.append("notes", ($("#glossaryNotes") && $("#glossaryNotes").value.trim()) || "");
        const res = await fetch(glossaryApiBase() + "/api/glossary/upload", {
          method: "POST",
          headers: { "X-DataHive-User": ($("#userNm") && $("#userNm").textContent.trim()) || "Admin" },
          body: fd,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error((data && data.detail) || ("HTTP " + res.status));
        }
        const apply = data.apply || {};
        const platforms = Array.isArray(apply.platforms) && apply.platforms.length
          ? apply.platforms.join(", ")
          : "n/a";
        const msg =
          'Uploaded "' + (data.file_name || glossarySelectedFile.name) + '". ' +
          "Registry updated: " + (apply.registry_updated != null ? apply.registry_updated : (apply.updated || 0)) +
          ", source synced: " + (apply.source_synced != null ? apply.source_synced : 0) +
          ", platforms: " + platforms +
          (apply.failed ? (", failed: " + apply.failed) : "") +
          (apply.skipped ? (", skipped: " + apply.skipped) : "") + ".";
        if (apply.failed && apply.errors && apply.errors.length) {
          showGlossaryError(msg + " " + apply.errors.slice(0, 3).join(" "));
        } else {
          showGlossaryOk(msg);
        }
        clearGlossarySelection();
        if ($("#glossaryNotes")) $("#glossaryNotes").value = "";
        await refreshGlossaryList();
      } catch (err) {
        showGlossaryError(err && err.message ? err.message : String(err));
      } finally {
        uploadBtn.disabled = false;
        uploadBtn.textContent = "Upload";
      }
    });
  }
}

async function initGlossaryView() {
  bindGlossaryEvents();
  await refreshGlossaryList();
}

const LINEAGE_LAYERS = {
  source: { label: "Source", color: "#3375B3", x: 40 },
  bronze: { label: "Bronze", color: "#0056A7", x: 280 },
  silver: { label: "Silver", color: "#046BD2", x: 520 },
  gold: { label: "Gold", color: "#FF671F", x: 760 },
  consume: { label: "Consume", color: "#1FA971", x: 1000 },
};

const LINEAGE_DEMO_GRAPH = {
  nodes: [
    { id: "src_crm", layer: "source", title: "CRM API", sub: "Salesforce / REST" },
    { id: "src_cdr", layer: "source", title: "CDR Landing", sub: "S3 / Parquet" },
    { id: "src_billing", layer: "source", title: "Billing Feed", sub: "CSV drop" },
    { id: "br_customer", layer: "bronze", title: "test_customer_tbl", sub: "dhpoc-bronze" },
    { id: "br_cdr", layer: "bronze", title: "cdr_raw", sub: "dhpoc-bronze" },
    { id: "br_invoice", layer: "bronze", title: "invoice_raw", sub: "dhpoc-bronze" },
    { id: "sv_customer", layer: "silver", title: "dh_customer", sub: "dhpoc-silver" },
    { id: "sv_cdr", layer: "silver", title: "dh_cdr", sub: "dhpoc-silver" },
    { id: "sv_invoice", layer: "silver", title: "dh_invoice", sub: "dhpoc-silver" },
    { id: "sv_churn", layer: "silver", title: "dh_churn_score", sub: "dhpoc-silver" },
    { id: "gd_360", layer: "gold", title: "customer_360", sub: "dhpoc-gold" },
    { id: "gd_usage", layer: "gold", title: "usage_daily", sub: "dhpoc-gold" },
    { id: "gd_ar", layer: "gold", title: "ar_aging", sub: "dhpoc-gold" },
    { id: "ui_insights", layer: "consume", title: "Reporting", sub: "SQL workbench" },
    { id: "ui_dash", layer: "consume", title: "Exec dashboard", sub: "Insights" },
  ],
  edges: [
    ["src_crm", "br_customer"],
    ["src_cdr", "br_cdr"],
    ["src_billing", "br_invoice"],
    ["br_customer", "sv_customer"],
    ["br_cdr", "sv_cdr"],
    ["br_invoice", "sv_invoice"],
    ["sv_customer", "sv_churn"],
    ["sv_cdr", "sv_churn"],
    ["sv_customer", "gd_360"],
    ["sv_churn", "gd_360"],
    ["sv_invoice", "gd_360"],
    ["sv_cdr", "gd_usage"],
    ["sv_invoice", "gd_ar"],
    ["gd_360", "ui_insights"],
    ["gd_usage", "ui_insights"],
    ["gd_360", "ui_dash"],
    ["gd_ar", "ui_dash"],
  ],
};

let LINEAGE_GRAPH = { nodes: [], edges: [] };

let govBound = false;
let lineageSelectedId = null;
const lineageState = {
  connectors: [],
  catalogItems: [],
  connectorId: "",
  scope: "",
};

function showGovernanceHome() {
  const home = $("#govHome");
  const lineage = $("#govLineage");
  const modeling = $("#govModeling");
  const quality = $("#govQuality");
  if (home) home.classList.remove("hidden");
  if (lineage) lineage.classList.add("hidden");
  if (modeling) modeling.classList.add("hidden");
  if (quality) quality.classList.add("hidden");
  lineageSelectedId = null;
  modelState.step = 1;
}

async function showLineageMap() {
  const home = $("#govHome");
  const lineage = $("#govLineage");
  const modeling = $("#govModeling");
  const quality = $("#govQuality");
  if (home) home.classList.add("hidden");
  if (modeling) modeling.classList.add("hidden");
  if (quality) quality.classList.add("hidden");
  if (lineage) lineage.classList.remove("hidden");
  await loadLineageConnectors();
  refreshLineageView();
  if (window.lucide && typeof lucide.createIcons === "function") {
    lucide.createIcons({ attrs: { "stroke-width": "1.75", "aria-hidden": "true" } });
  }
}

/* ---------- Governance: Data Quality ---------- */
const dqState = {
  connectors: [],
  catalogItems: [],
  schemas: [],
  connectorId: "",
  schema: "",
  result: null,
};

function showDqError(msg) {
  const el = $("#govDqError");
  if (!el) return;
  if (!msg) {
    el.classList.add("hidden");
    el.textContent = "";
    return;
  }
  el.textContent = msg;
  el.classList.remove("hidden");
}

async function showDataQuality() {
  const home = $("#govHome");
  const lineage = $("#govLineage");
  const modeling = $("#govModeling");
  const quality = $("#govQuality");
  if (home) home.classList.add("hidden");
  if (lineage) lineage.classList.add("hidden");
  if (modeling) modeling.classList.add("hidden");
  if (quality) quality.classList.remove("hidden");
  showDqError("");
  const status = $("#govDqStatus");
  if (status) status.textContent = "";
  await loadDqConnectors();
  if (window.lucide && typeof lucide.createIcons === "function") {
    lucide.createIcons({ attrs: { "stroke-width": "1.75", "aria-hidden": "true" } });
  }
}

async function loadDqConnectors() {
  const sel = $("#govDqConnector");
  if (!sel) return;
  const prev = dqState.connectorId || sel.value || "";
  sel.innerHTML = '<option value="">Loading connectors…</option>';
  try {
    if (typeof ensureDataHiveConnectorApi === "function") {
      await ensureDataHiveConnectorApi();
    }
    if (typeof DataHiveAssets === "undefined") throw new Error("Assets API not loaded");
    const data = await DataHiveAssets.connectors();
    dqState.connectors = data.items || [];
  } catch (_err) {
    dqState.connectors = [
      {
        id: "local-postgres",
        display_name: "Local Postgres",
        platform: "postgres",
      },
    ];
  }
  sel.innerHTML =
    '<option value="">Select connector…</option>' +
    dqState.connectors
      .map((c) => {
        const label =
          (c.display_name || c.id) +
          (c.platform || c.cloud ? " · " + (c.platform || c.cloud) : "");
        return (
          '<option value="' +
          escapeHtml(c.id) +
          '">' +
          escapeHtml(label) +
          "</option>"
        );
      })
      .join("");
  if (prev && [...sel.options].some((o) => o.value === prev)) {
    sel.value = prev;
    dqState.connectorId = prev;
    await onDqConnectorChange({ keepSchema: true });
  } else {
    dqState.connectorId = "";
    dqState.schema = "";
    dqState.catalogItems = [];
    fillDqSchemaSelect([]);
    fillDqTablesSelect([]);
  }
}

function fillDqSchemaSelect(schemas, preferred) {
  const sel = $("#govDqSchema");
  if (!sel) return;
  const list = (schemas || []).filter(Boolean);
  if (!list.length) {
    sel.disabled = true;
    sel.innerHTML = '<option value="">Select connector first…</option>';
    return;
  }
  const prev = preferred || dqState.schema || sel.value || "";
  sel.disabled = false;
  sel.innerHTML =
    '<option value="">Select layer / schema…</option>' +
    list.map((s) => '<option value="' + escapeHtml(s) + '">' + escapeHtml(s) + "</option>").join("");
  if (prev && [...sel.options].some((o) => o.value === prev)) sel.value = prev;
}

function fillDqTablesSelect(tables) {
  const sel = $("#govDqTables");
  const runBtn = $("#govDqRunBtn");
  if (!sel) return;
  const list = (tables || []).filter(Boolean);
  if (!list.length) {
    sel.disabled = true;
    sel.innerHTML = "";
    if (runBtn) runBtn.disabled = true;
    return;
  }
  sel.disabled = false;
  sel.innerHTML = list
    .map((t) => '<option value="' + escapeHtml(t) + '">' + escapeHtml(t) + "</option>")
    .join("");
  if (runBtn) runBtn.disabled = false;
}

async function onDqConnectorChange(opts) {
  const keepSchema = opts && opts.keepSchema;
  const connectorId = ($("#govDqConnector") && $("#govDqConnector").value) || "";
  dqState.connectorId = connectorId;
  if (!keepSchema) dqState.schema = "";
  dqState.catalogItems = [];
  const results = $("#govDqResults");
  if (results) results.classList.add("hidden");
  showDqError("");
  if (!connectorId) {
    fillDqSchemaSelect([]);
    fillDqTablesSelect([]);
    return;
  }
  fillDqSchemaSelect([], keepSchema ? dqState.schema : "");
  fillDqTablesSelect([]);
  try {
    if (typeof DataHiveAssets === "undefined") throw new Error("Assets API not loaded");
    const catalog = await DataHiveAssets.catalog(connectorId);
    dqState.catalogItems = catalog.items || [];
    const schemas = catalog.schemas || [
      ...new Set(dqState.catalogItems.map((i) => i.schema).filter(Boolean)),
    ];
    // Prefer medallion / raw / enriched style schemas first.
    const ranked = [...schemas].sort((a, b) => {
      const rank = (s) => {
        const x = String(s).toLowerCase();
        if (x.includes("raw") || x.includes("bronze")) return 0;
        if (x.includes("enriched") || x.includes("silver")) return 1;
        if (x.includes("gold") || x.includes("mart")) return 2;
        return 3;
      };
      return rank(a) - rank(b) || String(a).localeCompare(String(b));
    });
    dqState.schemas = ranked;
    fillDqSchemaSelect(ranked, keepSchema ? dqState.schema : "");
    if (keepSchema && dqState.schema) await onDqSchemaChange();
  } catch (err) {
    showDqError(err && err.message ? err.message : String(err));
    fillDqSchemaSelect([]);
  }
}

async function onDqSchemaChange() {
  const schema = ($("#govDqSchema") && $("#govDqSchema").value) || "";
  dqState.schema = schema;
  const results = $("#govDqResults");
  if (results) results.classList.add("hidden");
  showDqError("");
  if (!schema) {
    fillDqTablesSelect([]);
    return;
  }
  const schemaLc = schema.toLowerCase();
  const short = schemaLc.indexOf(".") >= 0 ? schemaLc.split(".").pop() : schemaLc;
  let tables = dqState.catalogItems
    .filter((a) => {
      if (!a || !a.name) return false;
      if (String(a.type || "") === "Schema") return false;
      const sch = String(a.schema || "").toLowerCase();
      return sch === schemaLc || sch === short || sch.endsWith("." + short);
    })
    .map((a) => String(a.name));
  if (!tables.length && typeof DataHiveAssets !== "undefined") {
    try {
      const data = await DataHiveAssets.tables(schema, dqState.connectorId);
      tables = (data.items || data.tables || []).map((t) =>
        typeof t === "string" ? t : t.name || t.table || ""
      );
    } catch (_err) {
      /* catalog already tried */
    }
  }
  tables = [...new Set(tables.filter(Boolean))].sort((a, b) => a.localeCompare(b));
  fillDqTablesSelect(tables);
}

function selectedDqTables() {
  const sel = $("#govDqTables");
  if (!sel) return [];
  return [...sel.selectedOptions].map((o) => o.value).filter(Boolean).slice(0, 12);
}

function connectorApiBaseUrl() {
  if (window.DATAHIVE_CONNECTOR_API) {
    return String(window.DATAHIVE_CONNECTOR_API).replace(/\/$/, "");
  }
  const host =
    window.location && window.location.hostname ? window.location.hostname : "127.0.0.1";
  return "http://" + host + ":5055";
}

async function runDataQualityChecks() {
  const connectorId = dqState.connectorId || ($("#govDqConnector") && $("#govDqConnector").value) || "";
  const schema = dqState.schema || ($("#govDqSchema") && $("#govDqSchema").value) || "";
  const tables = selectedDqTables();
  showDqError("");
  if (!connectorId) return showDqError("Select a connector.");
  if (!schema) return showDqError("Select a layer / schema.");
  if (!tables.length) return showDqError("Select at least one table.");

  const runBtn = $("#govDqRunBtn");
  const status = $("#govDqStatus");
  const prev = runBtn ? runBtn.textContent : "";
  if (runBtn) {
    runBtn.disabled = true;
    runBtn.textContent = "Running…";
  }
  if (status) status.textContent = "Profiling " + tables.length + " table(s)…";

  try {
    if (typeof ensureDataHiveConnectorApi === "function") {
      const ok = await ensureDataHiveConnectorApi();
      if (!ok) throw new Error("Connector API is not reachable.");
    }
    const res = await fetch(connectorApiBaseUrl() + "/api/data-quality/run", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-DataHive-User":
          (typeof getDataHiveUser === "function" && getDataHiveUser()) || "unknown",
      },
      body: JSON.stringify({ connector_id: connectorId, schema, tables }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(
        (data && (data.detail || data.message)) || "Data quality run failed (HTTP " + res.status + ")"
      );
    }
    dqState.result = data;
    renderDqDashboard(data);
    if (status) {
      status.textContent =
        "Last run · score " + data.score + " (" + data.grade + ") · " +
        (data.issue_summary && data.issue_summary.total != null
          ? data.issue_summary.total + " issue(s)"
          : "done");
    }
  } catch (err) {
    showDqError(err && err.message ? err.message : String(err));
    if (status) status.textContent = "";
  } finally {
    if (runBtn) {
      runBtn.disabled = false;
      runBtn.textContent = prev || "Run quality checks";
    }
  }
}

function renderDqDashboard(data) {
  const wrap = $("#govDqResults");
  if (!wrap) return;
  wrap.classList.remove("hidden");

  const scoreEl = $("#govDqScore");
  const gradeEl = $("#govDqGrade");
  if (scoreEl) {
    scoreEl.textContent = data.score != null ? String(data.score) : "—";
    scoreEl.className = "gov-dq-score grade-" + (data.grade || "F");
  }
  if (gradeEl) gradeEl.textContent = "Grade " + (data.grade || "—");

  const formula = $("#govDqFormula");
  if (formula && data.logic && data.logic.formula) {
    formula.textContent = data.logic.formula;
  }

  const dims = data.dimensions || {};
  const dimsEl = $("#govDqDims");
  if (dimsEl) {
    const order = ["completeness", "uniqueness", "validity", "schema", "volume"];
    dimsEl.innerHTML = order
      .map((k) => {
        const v = dims[k] != null ? Number(dims[k]) : 0;
        const w = (data.logic && data.logic.weights && data.logic.weights[k]) || 0;
        return (
          '<div class="gov-dq-dim">' +
          '<div class="nm">' +
          escapeHtml(k) +
          " · " +
          Math.round(w * 100) +
          "%</div>" +
          '<div class="val">' +
          v.toFixed(1) +
          "</div>" +
          '<div class="bar"><i style="width:' +
          Math.max(0, Math.min(100, v)) +
          '%"></i></div>' +
          "</div>"
        );
      })
      .join("");
  }

  const summary = data.issue_summary || {};
  const sumEl = $("#govDqIssueSummary");
  if (sumEl) {
    const total = summary.total || 0;
    sumEl.innerHTML =
      '<span class="gov-dq-pill ' +
      (total === 0 ? "ok" : "") +
      '">' +
      total +
      " issue(s)</span>" +
      '<span class="gov-dq-pill critical">' +
      (summary.critical || 0) +
      " critical</span>" +
      '<span class="gov-dq-pill high">' +
      (summary.high || 0) +
      " high</span>" +
      '<span class="gov-dq-pill medium">' +
      (summary.medium || 0) +
      " medium</span>";
  }

  const issuesEl = $("#govDqIssues");
  if (issuesEl) {
    const issues = data.issues || [];
    if (!issues.length) {
      issuesEl.innerHTML =
        '<div class="gov-dq-empty">No issues found across the selected tables.</div>';
    } else {
      issuesEl.innerHTML = issues
        .map((i) => {
          return (
            '<div class="gov-dq-issue">' +
            '<div class="sev ' +
            escapeHtml(i.severity || "info") +
            '">' +
            escapeHtml(i.severity || "info") +
            "</div>" +
            "<div>" +
            '<div class="title">' +
            escapeHtml(i.table ? i.table + " · " : "") +
            escapeHtml(i.title || "Issue") +
            "</div>" +
            '<div class="detail">' +
            escapeHtml(i.detail || "") +
            (i.category ? " · " + escapeHtml(i.category) : "") +
            "</div>" +
            "</div></div>"
          );
        })
        .join("");
    }
  }

  const body = $("#govDqChecksBody");
  if (body) {
    const rows = [];
    (data.tables_results || []).forEach((tr) => {
      (tr.checks || []).forEach((ch) => {
        rows.push(
          "<tr>" +
            "<td>" +
            escapeHtml(tr.table) +
            "<div style='color:#8a93a3;font-size:11px'>score " +
            (tr.score != null ? tr.score : "—") +
            " · " +
            escapeHtml(tr.grade || "") +
            "</div></td>" +
            "<td>" +
            escapeHtml(ch.name || ch.id || "") +
            "</td>" +
            "<td>" +
            escapeHtml(ch.dimension || "") +
            "</td>" +
            "<td><span class='gov-dq-status " +
            escapeHtml(ch.status || "") +
            "'>" +
            escapeHtml(ch.status || "") +
            "</span></td>" +
            "<td>" +
            escapeHtml(ch.detail || "") +
            "</td>" +
            "</tr>"
        );
      });
      if (!(tr.checks || []).length && tr.error) {
        rows.push(
          "<tr><td>" +
            escapeHtml(tr.table) +
            "</td><td colspan='4'><span class='gov-dq-status fail'>error</span> " +
            escapeHtml(tr.error) +
            "</td></tr>"
        );
      }
    });
    body.innerHTML = rows.length
      ? rows.join("")
      : "<tr><td colspan='5'>No checks returned.</td></tr>";
  }

  const logicEl = $("#govDqLogic");
  if (logicEl && data.logic) {
    const dimsDoc = data.logic.dimensions || {};
    const grades = data.logic.grades || {};
    logicEl.innerHTML =
      "<p><strong>Formula:</strong> " +
      escapeHtml(data.logic.formula || "") +
      "</p>" +
      "<p><strong>Dimension logic</strong></p><ul>" +
      Object.keys(dimsDoc)
        .map(
          (k) =>
            "<li><strong>" +
            escapeHtml(k) +
            ":</strong> " +
            escapeHtml(dimsDoc[k]) +
            "</li>"
        )
        .join("") +
      "</ul>" +
      "<p><strong>Grades:</strong> " +
      Object.keys(grades)
        .map((g) => escapeHtml(g) + " = " + escapeHtml(grades[g]))
        .join(" · ") +
      "</p>" +
      "<p>Checks include row volume, null rates, primary-key uniqueness, empty strings on text columns, and schema PK presence. " +
      "Per-table scores are averaged equally into the estate score for the selected tables.</p>";
  }
}

function lineagePlatformOf(connector) {
  if (!connector) return "";
  return String(connector.platform || connector.cloud || "").toLowerCase();
}

function lineageScopeMeta(platform) {
  const p = String(platform || "").toLowerCase();
  if (p === "aws" || p === "amazonwebservices") {
    return {
      label: "Bucket / stage",
      help: "S3 buckets, Glue databases, or landing stages for this connection.",
      empty: "Select connector first…",
      placeholder: "Select bucket / stage…",
    };
  }
  if (p === "gcp" || p === "googlecloud") {
    return {
      label: "Dataset / bucket",
      help: "BigQuery datasets or Cloud Storage buckets in scope.",
      empty: "Select connector first…",
      placeholder: "Select dataset / bucket…",
    };
  }
  if (p === "azure" || p === "microsoftazure") {
    return {
      label: "Container / layer",
      help: "Blob / ADLS containers or medallion layers for this connection.",
      empty: "Select connector first…",
      placeholder: "Select container / layer…",
    };
  }
  if (p === "snowflake") {
    return {
      label: "Database / stage",
      help: "Snowflake databases or named stages to trace lineage from.",
      empty: "Select connector first…",
      placeholder: "Select database / stage…",
    };
  }
  return {
    label: "Layer / schema",
    help: "Medallion layers (raw / bronze / enriched / silver / gold) or schemas for this connection.",
    empty: "Select connector first…",
    placeholder: "Select layer / schema…",
  };
}

function setLineageScopeLabels(platform) {
  const meta = lineageScopeMeta(platform);
  const label = $("#govLineageScopeLabel");
  const help = $("#govLineageScopeHelp");
  if (label) {
    label.innerHTML = escapeHtml(meta.label) + ' <span class="req">*</span>';
  }
  if (help) help.textContent = meta.help;
}

async function loadLineageConnectors() {
  const sel = $("#govLineageConnector");
  if (!sel) return;
  const prev = lineageState.connectorId || sel.value || "";
  sel.innerHTML = '<option value="">Loading connectors…</option>';
  try {
    if (typeof ensureDataHiveConnectorApi === "function") {
      await ensureDataHiveConnectorApi();
    }
    if (typeof DataHiveAssets === "undefined") throw new Error("Assets API not loaded");
    const data = await DataHiveAssets.connectors();
    lineageState.connectors = data.items || [];
  } catch (_err) {
    lineageState.connectors = [
      {
        id: "local-postgres",
        display_name: "Local Postgres",
        platform: "postgres",
        dataset_scope: "datahivepoc",
      },
    ];
  }
  sel.innerHTML =
    '<option value="">Select connector…</option>' +
    lineageState.connectors
      .map((c) => {
        const label =
          (c.display_name || c.id) +
          (c.platform || c.cloud ? " · " + (c.platform || c.cloud) : "");
        return (
          '<option value="' +
          escapeHtml(c.id) +
          '">' +
          escapeHtml(label) +
          "</option>"
        );
      })
      .join("");
  if (prev && [...sel.options].some((o) => o.value === prev)) {
    sel.value = prev;
    lineageState.connectorId = prev;
    await onLineageConnectorChange({ keepScope: true });
  } else {
    lineageState.connectorId = "";
    lineageState.scope = "";
    lineageState.catalogItems = [];
    fillLineageScopeSelect(null);
    setLineageScopeLabels("");
  }
}

function fillLineageScopeSelect(connector, options, preferred) {
  const sel = $("#govLineageScope");
  if (!sel) return;
  const platform = lineagePlatformOf(connector);
  const meta = lineageScopeMeta(platform);
  setLineageScopeLabels(platform);
  if (!connector) {
    sel.disabled = true;
    sel.innerHTML = '<option value="">' + escapeHtml(meta.empty) + "</option>";
    return;
  }
  const list = (options || []).filter(Boolean);
  if (!list.length) {
    sel.disabled = true;
    sel.innerHTML = '<option value="">No layers / buckets / stages found…</option>';
    return;
  }
  const prev = preferred || lineageState.scope || sel.value || "";
  sel.disabled = false;
  sel.innerHTML =
    '<option value="">' +
    escapeHtml(meta.placeholder) +
    "</option>" +
    '<option value="__all__">All layers / buckets / stages</option>' +
    list
      .map((d) => '<option value="' + escapeHtml(d) + '">' + escapeHtml(d) + "</option>")
      .join("");
  if (prev && [...sel.options].some((o) => o.value === prev)) sel.value = prev;
}

function collectLineageScopeOptions(connector, catalogItems, schemas) {
  const platform = lineagePlatformOf(connector);
  const scopes = new Set();
  const add = (v) => {
    const s = String(v || "").trim();
    if (s) scopes.add(s);
  };

  (catalogItems || []).forEach((a) => {
    add(a.database);
    add(a.schema);
    add(a.bucket);
    add(a.stage);
    add(a.container);
    add(a.dataset);
  });
  (schemas || []).forEach(add);

  if (connector && connector.dataset_scope) {
    String(connector.dataset_scope)
      .split(/[,;\n]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach(add);
  }

  // Platform-aware defaults so the dropdown is useful even with sparse catalogs.
  if (platform === "aws" || platform === "amazonwebservices") {
    ["s3://raw", "s3://bronze", "s3://silver", "s3://gold", "s3://enriched", "glue:default"].forEach(add);
  } else if (platform === "gcp" || platform === "googlecloud") {
    ["raw", "bronze", "silver", "enriched", "gold"].forEach(add);
  } else if (platform === "azure" || platform === "microsoftazure") {
    ["landing", "bronze", "silver", "enriched", "gold"].forEach(add);
  } else if (platform === "snowflake") {
    ["RAW", "BRONZE", "SILVER", "ENRICHED", "GOLD", "@STAGE_LANDING"].forEach(add);
    ["bronze", "silver", "enriched", "gold", "raw"].forEach((layer) => {
      if ((schemas || []).some((s) => String(s).toLowerCase().includes(layer))) add(layer);
    });
  } else {
    ["raw", "bronze", "silver", "enriched", "gold", "source"].forEach(add);
    if (connector && connector.id === "local-postgres") add("datahivepoc");
  }

  return [...scopes].sort((a, b) => a.localeCompare(b));
}

async function onLineageConnectorChange(opts) {
  const keepScope = opts && opts.keepScope;
  const connectorId = ($("#govLineageConnector") && $("#govLineageConnector").value) || "";
  lineageState.connectorId = connectorId;
  if (!keepScope) {
    lineageState.scope = "";
    lineageSelectedId = null;
  }
  lineageState.catalogItems = [];
  const connector = lineageState.connectors.find((c) => c.id === connectorId) || null;
  if (!connectorId || !connector) {
    fillLineageScopeSelect(null);
    refreshLineageView();
    return;
  }
  fillLineageScopeSelect(connector, [], keepScope ? lineageState.scope : "");
  try {
    if (typeof DataHiveAssets === "undefined") throw new Error("Assets API not loaded");
    const catalog = await DataHiveAssets.catalog(connectorId);
    lineageState.catalogItems = catalog.items || [];
    const schemas = catalog.schemas || [
      ...new Set(lineageState.catalogItems.map((i) => i.schema).filter(Boolean)),
    ];
    const options = collectLineageScopeOptions(connector, lineageState.catalogItems, schemas);
    fillLineageScopeSelect(connector, options, keepScope ? lineageState.scope : "");
  } catch (_err) {
    const options = collectLineageScopeOptions(connector, [], []);
    fillLineageScopeSelect(connector, options, keepScope ? lineageState.scope : "");
  }
  refreshLineageView();
}

function onLineageScopeChange() {
  const sel = $("#govLineageScope");
  lineageState.scope = (sel && sel.value) || "";
  lineageSelectedId = null;
  refreshLineageView();
}

function lineageInferLayer(assetOrName) {
  const s = String(
    (assetOrName && (assetOrName.schema || assetOrName.database || assetOrName.layer)) ||
      assetOrName ||
      ""
  ).toLowerCase();
  // Prefer later medallion layers first so names like "raw_enriched" resolve correctly.
  if (s.includes("consume") || s.includes("dashboard") || s.includes("report")) return "consume";
  if (s.includes("gold") || s.includes("mart")) return "gold";
  if (
    s.includes("silver") ||
    s.includes("curated") ||
    s.includes("cleansed") ||
    s.includes("enriched") ||
    s.includes("enrich")
  ) {
    return "silver";
  }
  if (s.includes("bronze") || s.includes("raw") || s.includes("landing")) return "bronze";
  if (s.includes("source") || s.includes("stage") || s.startsWith("@") || s.startsWith("s3://")) {
    return "source";
  }
  // Dimensional / mart objects without a layer keyword still belong in silver.
  const name = String(
    (assetOrName && (assetOrName.name || assetOrName.table || assetOrName.title)) || ""
  ).toLowerCase();
  if (/^(dim_|fact_|vw_)/.test(name)) return "silver";
  return "bronze";
}

function lineageStemEntity(key) {
  let s = String(key || "");
  if (s.length > 4 && s.endsWith("ies")) return s.slice(0, -3) + "y";
  if (s.length > 4 && s.endsWith("ses")) return s.slice(0, -2);
  if (s.length > 3 && s.endsWith("s") && !s.endsWith("ss")) return s.slice(0, -1);
  return s;
}

function lineageNormalizeKey(name) {
  const cleaned = String(name || "")
    .toLowerCase()
    .replace(/^(dh_|test_|stg_|raw_|src_|fact_|dim_|vw_)/, "")
    .replace(/(_tbl|_table|_raw|_curated|_enriched|_score|_daily|_aging|_view)$/, "")
    .replace(/[^a-z0-9]+/g, "");
  return lineageStemEntity(cleaned);
}

/** Multiple match keys so CUSTOMERS ↔ dim_customer and invoice_raw ↔ fact_invoice connect. */
function lineageEntityKeys(name) {
  const keys = new Set();
  const add = (v) => {
    const k = String(v || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
    if (!k || k.length < 3) return;
    keys.add(k);
    keys.add(lineageStemEntity(k));
    if (!k.endsWith("s") && k.length > 2) keys.add(k + "s");
    if (k.endsWith("y") && k.length > 3) keys.add(k.slice(0, -1) + "ies");
  };
  const stripped = String(name || "")
    .toLowerCase()
    .replace(/^(dh_|test_|stg_|raw_|src_|fact_|dim_|vw_)/, "")
    .replace(/(_tbl|_table|_raw|_curated|_enriched|_score|_daily|_aging|_view)$/, "")
    .replace(/[^a-z0-9]+/g, "");
  add(stripped);
  // Tokenize so DH_POC_CUSTOMERS and dim_customer share the "customer" key.
  String(name || "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .forEach((tok) => {
      const clean = tok.replace(/^(dh|test|stg|raw|src|fact|dim|vw|poc)+/, "");
      if (clean.length >= 4) add(clean);
      else if (tok.length >= 4) add(tok);
    });
  return [...keys].filter(Boolean);
}

const MODEL_LINEAGE_STORAGE_KEY = "datahive.modelLineage";

function loadModelLineageEdges() {
  try {
    const raw = localStorage.getItem(MODEL_LINEAGE_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (_err) {
    return [];
  }
}

function saveModelLineageEdges(edges) {
  try {
    localStorage.setItem(MODEL_LINEAGE_STORAGE_KEY, JSON.stringify((edges || []).slice(-300)));
  } catch (_err) {
    /* ignore quota / private mode */
  }
}

function lineageSchemaAliases(schema) {
  const s = String(schema || "").toLowerCase().trim();
  if (!s) return [];
  const aliases = new Set([s]);
  if (s.indexOf(".") >= 0) aliases.add(s.split(".").pop());
  return [...aliases];
}

function lineageAssetInScope(asset, scopeLc, scopeLayer) {
  const fields = [
    asset.database,
    asset.schema,
    asset.bucket,
    asset.stage,
    asset.container,
    asset.dataset,
    asset.name,
  ]
    .map((x) => String(x || "").toLowerCase())
    .filter(Boolean);
  if (fields.some((f) => f === scopeLc || f.includes(scopeLc) || scopeLc.includes(f))) {
    return true;
  }
  // When a medallion keyword is selected (e.g. enriched), keep upstream/downstream
  // layers so RAW → ENRICHED edges remain visible.
  if (!scopeLayer || scopeLayer === "source" || scopeLayer === "consume") return false;
  const assetLayer = lineageInferLayer(asset);
  const order = ["source", "bronze", "silver", "gold", "consume"];
  const selectedIdx = order.indexOf(scopeLayer);
  const assetIdx = order.indexOf(assetLayer);
  if (selectedIdx < 0 || assetIdx < 0) return false;
  return Math.abs(assetIdx - selectedIdx) <= 1 || assetIdx < selectedIdx;
}

function buildLineageGraphFromCatalog(connector, scope, items) {
  const connLabel = (connector && (connector.display_name || connector.id)) || "connector";
  const scopeVal = String(scope || "");
  const allScopes = scopeVal === "__all__";
  const scopeLc = scopeVal.toLowerCase();
  const scopeLayer = allScopes || !scopeVal ? "" : lineageInferLayer(scopeVal);
  const filtered = (items || []).filter((a) => {
    if (allScopes || !scopeVal) return true;
    return lineageAssetInScope(a, scopeLc, scopeLayer);
  });

  if (!filtered.length) {
    // Fall back to demo graph filtered by selected medallion scope when catalog is empty.
    return filterDemoLineageGraph(scopeVal);
  }

  const nodes = [];
  const byKeyLayer = {};
  const bySchemaTable = {};
  const registerSchemaTable = (schema, table, id) => {
    const nm = String(table || "").toLowerCase();
    if (!nm) return;
    lineageSchemaAliases(schema).forEach((sch) => {
      bySchemaTable[sch + "\0" + nm] = id;
    });
  };

  filtered.slice(0, 80).forEach((a, idx) => {
    const layer = lineageInferLayer(a);
    const title = a.name || a.table || a.id || "asset_" + (idx + 1);
    const sub =
      a.schema || a.database || a.bucket || a.stage || a.container || connLabel;
    const id = "n_" + layer + "_" + idx + "_" + lineageNormalizeKey(title).slice(0, 24);
    const node = {
      id,
      layer,
      title,
      sub: String(sub),
      schema: String(a.schema || ""),
      name: String(title),
    };
    nodes.push(node);
    registerSchemaTable(a.schema, title, id);
    lineageEntityKeys(title).forEach((key) => {
      const bucket = (byKeyLayer[key] = byKeyLayer[key] || {});
      const list = (bucket[layer] = bucket[layer] || []);
      if (list.indexOf(id) < 0) list.push(id);
    });
  });

  // Seed a source node for the selected scope when tracing a single landing zone.
  if (!allScopes && scopeVal && !nodes.some((n) => n.layer === "source")) {
    nodes.unshift({
      id: "src_scope",
      layer: "source",
      title: scopeVal,
      sub: connLabel,
    });
  }

  const edges = [];
  const edgeSet = new Set();
  const addEdge = (fromId, toId) => {
    if (!fromId || !toId || fromId === toId) return;
    const key = fromId + "->" + toId;
    if (edgeSet.has(key)) return;
    edgeSet.add(key);
    edges.push([fromId, toId]);
  };

  const layerFlow = ["source", "bronze", "silver", "gold", "consume"];
  Object.keys(byKeyLayer).forEach((key) => {
    const map = byKeyLayer[key];
    for (let i = 0; i < layerFlow.length - 1; i++) {
      const lefts = map[layerFlow[i]] || [];
      const rights = map[layerFlow[i + 1]] || [];
      lefts.forEach((a) => rights.forEach((b) => addEdge(a, b)));
    }
  });

  // Real edges recorded when Data Modeling generates DDL/ingest (RAW → ENRICHED, FK, views).
  const connectorId = (connector && connector.id) || "";
  loadModelLineageEdges()
    .filter((e) => !e.connectorId || e.connectorId === connectorId)
    .forEach((e) => {
      const fromName = String(e.fromTable || "").toLowerCase();
      const toName = String(e.toTable || "").toLowerCase();
      if (!fromName || !toName) return;
      let fromId = null;
      let toId = null;
      lineageSchemaAliases(e.fromSchema).some((sch) => {
        fromId = bySchemaTable[sch + "\0" + fromName];
        return !!fromId;
      });
      lineageSchemaAliases(e.toSchema).some((sch) => {
        toId = bySchemaTable[sch + "\0" + toName];
        return !!toId;
      });
      // Fall back to entity-key match across layers when schema casing differs.
      if (!fromId) {
        const keys = lineageEntityKeys(e.fromTable);
        for (let i = 0; i < keys.length && !fromId; i++) {
          const map = byKeyLayer[keys[i]] || {};
          fromId = (map.bronze || map.source || map.silver || [])[0] || null;
        }
      }
      if (!toId) {
        const keys = lineageEntityKeys(e.toTable);
        for (let i = 0; i < keys.length && !toId; i++) {
          const map = byKeyLayer[keys[i]] || {};
          toId = (map.silver || map.gold || map.bronze || [])[0] || null;
        }
      }
      addEdge(fromId, toId);
    });

  if (nodes.some((n) => n.id === "src_scope")) {
    nodes
      .filter((n) => n.layer === "bronze")
      .slice(0, 6)
      .forEach((n) => addEdge("src_scope", n.id));
  }

  // If same-name / recorded edges are still sparse, connect adjacent layers by position.
  if (edges.length < 2) {
    for (let i = 0; i < layerFlow.length - 1; i++) {
      const left = nodes.filter((n) => n.layer === layerFlow[i]);
      const right = nodes.filter((n) => n.layer === layerFlow[i + 1]);
      left.slice(0, 4).forEach((ln, idx) => {
        const rn = right[idx % Math.max(right.length, 1)];
        if (rn) addEdge(ln.id, rn.id);
      });
    }
  }

  return { nodes, edges };
}

function filterDemoLineageGraph(scope) {
  const scopeVal = String(scope || "").toLowerCase();
  if (!scopeVal || scopeVal === "__all__") {
    return {
      nodes: LINEAGE_DEMO_GRAPH.nodes.map((n) => ({ ...n })),
      edges: LINEAGE_DEMO_GRAPH.edges.map((e) => e.slice()),
    };
  }
  const layerHint = lineageInferLayer(scopeVal);
  const keepLayers = new Set(["source", layerHint, "consume"]);
  if (layerHint === "bronze") ["silver", "gold"].forEach((l) => keepLayers.add(l));
  if (layerHint === "silver") {
    keepLayers.add("bronze");
    keepLayers.add("gold");
  }
  if (layerHint === "gold") {
    keepLayers.add("silver");
    keepLayers.add("bronze");
  }
  if (
    scopeVal.includes("bucket") ||
    scopeVal.startsWith("s3://") ||
    scopeVal.startsWith("@") ||
    scopeVal.includes("stage")
  ) {
    ["source", "bronze", "silver", "gold", "consume"].forEach((l) => keepLayers.add(l));
  }
  const nodes = LINEAGE_DEMO_GRAPH.nodes
    .filter((n) => keepLayers.has(n.layer))
    .map((n) => ({ ...n }));
  const ids = new Set(nodes.map((n) => n.id));
  const edges = LINEAGE_DEMO_GRAPH.edges.filter(([a, b]) => ids.has(a) && ids.has(b));
  return { nodes, edges };
}

function refreshLineageView() {
  const connectorId = lineageState.connectorId;
  const scope = lineageState.scope || ($("#govLineageScope") && $("#govLineageScope").value) || "";
  const empty = $("#govLineageEmpty");
  const svg = $("#govLineageSvg");
  if (!connectorId || !scope) {
    LINEAGE_GRAPH = { nodes: [], edges: [] };
    if (empty) {
      empty.classList.remove("hidden");
      empty.textContent =
        "Select a connector and a layer / bucket / stage to load the lineage map.";
    }
    if (svg) svg.classList.add("hidden");
    updateLineageDetail(null);
    return;
  }
  const connector = lineageState.connectors.find((c) => c.id === connectorId) || null;
  LINEAGE_GRAPH = buildLineageGraphFromCatalog(
    connector,
    scope,
    lineageState.catalogItems
  );
  if (!LINEAGE_GRAPH.nodes.length) {
    if (empty) {
      empty.classList.remove("hidden");
      empty.textContent = "No lineage assets found for this connector and scope.";
    }
    if (svg) svg.classList.add("hidden");
    updateLineageDetail(null);
    return;
  }
  if (empty) empty.classList.add("hidden");
  if (svg) svg.classList.remove("hidden");
  renderLineageMap(lineageSelectedId);
}

/* ---------- Governance: Data Modeling wizard ---------- */
const modelState = {
  step: 1,
  connectors: [],
  catalogItems: [],
  proposal: [],
  ddl: "",
  ingest: "",
};

function showModelError(msg) {
  const el = $("#govModelError");
  if (!el) return;
  if (!msg) {
    el.classList.add("hidden");
    el.textContent = "";
    return;
  }
  el.textContent = msg;
  el.classList.remove("hidden");
}

function setModelStep(step) {
  modelState.step = step;
  const s1 = $("#govModelStep1");
  const s2 = $("#govModelStep2");
  const s3 = $("#govModelStep3");
  if (s1) s1.classList.toggle("hidden", step !== 1);
  if (s2) s2.classList.toggle("hidden", step !== 2);
  if (s3) s3.classList.toggle("hidden", step !== 3);
  document.querySelectorAll("[data-model-step-pill]").forEach((pill) => {
    const n = Number(pill.getAttribute("data-model-step-pill"));
    pill.classList.toggle("active", n === step);
    pill.classList.toggle("done", n < step);
  });
}

async function showDataModeling() {
  const home = $("#govHome");
  const lineage = $("#govLineage");
  const modeling = $("#govModeling");
  const quality = $("#govQuality");
  if (home) home.classList.add("hidden");
  if (lineage) lineage.classList.add("hidden");
  if (quality) quality.classList.add("hidden");
  if (modeling) modeling.classList.remove("hidden");
  setModelStep(1);
  showModelError("");
  await loadModelConnectors();
  if (window.lucide && typeof lucide.createIcons === "function") {
    lucide.createIcons({ attrs: { "stroke-width": "1.75", "aria-hidden": "true" } });
  }
}

async function loadModelConnectors() {
  const sel = $("#govModelConnector");
  if (!sel) return;
  sel.innerHTML = '<option value="">Loading connectors…</option>';
  try {
    if (typeof DataHiveAssets === "undefined") throw new Error("Assets API not loaded");
    const data = await DataHiveAssets.connectors();
    modelState.connectors = data.items || [];
  } catch (_err) {
    modelState.connectors = [
      {
        id: "local-postgres",
        display_name: "Local Postgres",
        platform: "postgres",
        dataset_scope: "datahivepoc",
      },
    ];
  }
  sel.innerHTML =
    '<option value="">Select connector…</option>' +
    modelState.connectors
      .map((c) => {
        const label =
          (c.display_name || c.id) +
          (c.platform || c.cloud ? " · " + (c.platform || c.cloud) : "");
        return (
          '<option value="' +
          escapeHtml(c.id) +
          '">' +
          escapeHtml(label) +
          "</option>"
        );
      })
      .join("");
  fillModelDatabaseSelect("");
  fillModelSchemaSelect([]);
  fillModelTargetSchemaSelect([]);
}

function modelLayerFromSchema(schema) {
  const s = String(schema || "").toLowerCase();
  if (s.includes("gold") || s.includes("mart")) return "gold";
  if (s.includes("silver") || s.includes("enriched") || s.includes("curated")) return "silver";
  if (s.includes("bronze") || s.includes("raw") || s.includes("landing")) return "bronze";
  return "warehouse";
}

/** Persist RAW/source → ENRICHED/dim-fact-view edges for the lineage map. */
function recordModelLineage(proposal, scope) {
  const sourceSchema = String((scope && scope.schema) || "");
  const targetSchema = String((scope && scope.targetSchema) || "gold");
  const connectorId = String((scope && scope.connectorId) || "");
  const selected = (proposal || []).filter((p) => p && p.selected);
  if (!selected.length || !targetSchema) return;

  const targetLc = targetSchema.toLowerCase();
  const kept = loadModelLineageEdges().filter(
    (e) =>
      !(
        String(e.connectorId || "") === connectorId &&
        String(e.toSchema || "").toLowerCase() === targetLc
      )
  );
  const seen = new Set(
    kept.map(
      (e) =>
        [e.connectorId, e.fromSchema, e.fromTable, e.toSchema, e.toTable]
          .map((x) => String(x || "").toLowerCase())
          .join("\0")
    )
  );
  const pushEdge = (fromSchema, fromTable, toSchema, toTable) => {
    if (!fromTable || !toTable) return;
    const edge = {
      connectorId,
      fromSchema: String(fromSchema || ""),
      fromTable: String(fromTable),
      toSchema: String(toSchema || ""),
      toTable: String(toTable),
      recordedAt: new Date().toISOString(),
    };
    const key = [connectorId, edge.fromSchema, edge.fromTable, edge.toSchema, edge.toTable]
      .map((x) => String(x || "").toLowerCase())
      .join("\0");
    if (seen.has(key)) return;
    seen.add(key);
    kept.push(edge);
  };

  const selectedNames = new Set(selected.map((p) => p.name || p.id).filter(Boolean));
  const viewDeps = {
    vw_customer_360: ["dim_customer"],
    vw_daily_kpi: ["dim_date", "fact_usage_daily", "fact_invoice"],
    vw_revenue_monthly: ["fact_invoice", "dim_date", "dim_customer"],
  };

  selected.forEach((p) => {
    if (p.kind === "dimension" || p.kind === "fact") {
      const srcTable =
        typeof modelResolveSourceTable === "function"
          ? modelResolveSourceTable(p, scope)
          : p.source_table || null;
      if (srcTable) pushEdge(sourceSchema, srcTable, targetSchema, p.name);
    }
    (p.foreign_keys || []).forEach((fk) => {
      const ref = fk && fk.ref_table;
      if (ref && selectedNames.has(ref)) pushEdge(targetSchema, ref, targetSchema, p.name);
    });
    if (p.kind === "view") {
      (viewDeps[p.id] || []).forEach((dep) => {
        if (selectedNames.has(dep)) pushEdge(targetSchema, dep, targetSchema, p.name);
      });
    }
  });

  saveModelLineageEdges(kept);
}

async function onModelConnectorChange() {
  const connectorId = ($("#govModelConnector") && $("#govModelConnector").value) || "";
  showModelError("");
  fillModelDatabaseSelect(connectorId);
  fillModelSchemaSelect([]);
  modelState.catalogItems = [];
  if (!connectorId) return;
  try {
    if (typeof DataHiveAssets === "undefined") throw new Error("Assets API not loaded");
    const catalog = await DataHiveAssets.catalog(connectorId);
    modelState.catalogItems = catalog.items || [];
    const schemas = catalog.schemas || [
      ...new Set(modelState.catalogItems.map((i) => i.schema).filter(Boolean)),
    ];
    // Populate database/layer from asset databases + inferred layers.
    const dbSel = $("#govModelDatabase");
    if (dbSel) {
      const dbs = new Set();
      modelState.catalogItems.forEach((a) => {
        if (a.database) dbs.add(String(a.database));
      });
      const conn = modelState.connectors.find((c) => c.id === connectorId);
      if (conn && conn.dataset_scope) dbs.add(String(conn.dataset_scope).split(/[,;\n]/)[0].trim());
      if (connectorId === "local-postgres") dbs.add("datahivepoc");
      ["raw", "bronze", "silver", "enriched", "gold"].forEach((layer) => {
        if (schemas.some((s) => String(s).toLowerCase().includes(layer))) dbs.add(layer);
      });
      if (!dbs.size) dbs.add("default");
      const prev = dbSel.value;
      dbSel.disabled = false;
      dbSel.innerHTML =
        '<option value="">Select database / layer…</option>' +
        [...dbs]
          .filter(Boolean)
          .map((d) => '<option value="' + escapeHtml(d) + '">' + escapeHtml(d) + "</option>")
          .join("");
      if (prev && [...dbSel.options].some((o) => o.value === prev)) dbSel.value = prev;
    }
    fillModelSchemaSelect(schemas);
    fillModelTargetSchemaSelect(schemas);
  } catch (err) {
    showModelError(err && err.message ? err.message : String(err));
  }
}

function fillModelDatabaseSelect(connectorId) {
  const dbSel = $("#govModelDatabase");
  if (!dbSel) return;
  if (!connectorId) {
    dbSel.disabled = true;
    dbSel.innerHTML = '<option value="">Select connector first…</option>';
    return;
  }
  dbSel.disabled = false;
  dbSel.innerHTML = '<option value="">Select database / layer…</option>';
}

function fillModelSchemaSelect(schemas) {
  const sel = $("#govModelSchema");
  if (!sel) return;
  const list = (schemas || []).filter(Boolean);
  if (!list.length) {
    sel.disabled = true;
    sel.innerHTML = '<option value="">Select database / layer first…</option>';
    return;
  }
  sel.disabled = false;
  sel.innerHTML =
    '<option value="">Select schema…</option>' +
    list.map((s) => '<option value="' + escapeHtml(s) + '">' + escapeHtml(s) + "</option>").join("");
}

function suggestedTargetSchemas(sourceSchemas, database) {
  const db = String(database || "").toLowerCase();
  const existing = (sourceSchemas || []).map((s) => String(s)).filter(Boolean);
  const defaults = [];
  if (db.includes("bronze") || db.includes("raw") || db === "bronze" || db === "raw") {
    defaults.push("enriched", "ENRICHED", "silver", "dhpoc-silver", "gold", "dhpoc-gold");
  } else if (db.includes("silver") || db.includes("enriched") || db === "silver") {
    defaults.push("gold", "dhpoc-gold", "mart", "analytics_mart");
  } else if (db.includes("gold") || db === "gold") {
    defaults.push("gold_mart", "analytics_mart", "gold", "dhpoc-gold");
  } else {
    defaults.push(
      "enriched",
      "ENRICHED",
      "gold",
      "dhpoc-gold",
      "silver",
      "dhpoc-silver",
      "analytics_mart"
    );
  }
  // Prefer enriched / silver / gold schemas already present in the catalog.
  existing.forEach((s) => {
    const sl = s.toLowerCase();
    if (
      sl.includes("enriched") ||
      sl.includes("gold") ||
      sl.includes("mart") ||
      sl.includes("silver")
    ) {
      defaults.unshift(s);
    }
  });
  const out = [];
  const seen = new Set();
  defaults.concat(existing).forEach((s) => {
    const key = String(s).toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push(String(s));
  });
  return out;
}

function preferredTargetSchema(options, database) {
  const db = String(database || "").toLowerCase();
  const pick = (pred) => options.find((s) => pred(String(s).toLowerCase()));
  if (db.includes("bronze") || db.includes("raw") || db === "bronze" || db === "raw") {
    return (
      pick((s) => s.includes("enriched")) ||
      pick((s) => s.includes("silver")) ||
      pick((s) => s.includes("gold")) ||
      options[0] ||
      ""
    );
  }
  if (db.includes("gold") || db === "gold") {
    return pick((s) => s.includes("mart")) || pick((s) => s === "gold" || s.includes("gold")) || options[0] || "";
  }
  return (
    pick((s) => s.includes("gold")) ||
    pick((s) => s.includes("mart")) ||
    pick((s) => s.includes("enriched")) ||
    options[0] ||
    ""
  );
}

function fillModelTargetSchemaSelect(sourceSchemas, database, preferred) {
  const sel = $("#govModelTargetSchema");
  if (!sel) return;
  const options = suggestedTargetSchemas(sourceSchemas, database);
  if (!options.length) {
    sel.disabled = true;
    sel.innerHTML = '<option value="">Select connector first…</option>';
    return;
  }
  const prev = preferred || sel.value || preferredTargetSchema(options, database);
  sel.disabled = false;
  sel.innerHTML =
    '<option value="">Select target schema…</option>' +
    options
      .map((s) => '<option value="' + escapeHtml(s) + '">' + escapeHtml(s) + "</option>")
      .join("");
  if (prev && [...sel.options].some((o) => o.value === prev)) sel.value = prev;
  else sel.value = preferredTargetSchema(options, database) || "";
}

function filterModelSchemasForDatabase(database) {
  const db = String(database || "").toLowerCase();
  const allSchemas = [
    ...new Set(modelState.catalogItems.map((i) => i.schema).filter(Boolean)),
  ];
  let filtered = allSchemas;
  if (db && db !== "default") {
    // Layer filters match schema names; otherwise match database field.
    const layerMatch = ["raw", "bronze", "silver", "enriched", "gold"].includes(db);
    filtered = allSchemas.filter((s) => {
      const sl = String(s).toLowerCase();
      if (layerMatch) return sl.includes(db);
      return modelState.catalogItems.some(
        (a) =>
          a.schema === s &&
          String(a.database || "").toLowerCase() === db
      );
    });
    if (!filtered.length) filtered = allSchemas;
  }
  fillModelSchemaSelect(filtered);
  fillModelTargetSchemaSelect(allSchemas.length ? allSchemas : filtered, database);
}

function quoteModelIdent(name) {
  return '"' + String(name || "").replace(/"/g, '""') + '"';
}

function modelPlatformOf(scope) {
  const conn = modelState.connectors.find((c) => c.id === (scope && scope.connectorId));
  return String((conn && (conn.platform || conn.cloud)) || "postgres").toLowerCase();
}

function modelTypes(platform) {
  const sf = platform === "snowflake";
  return {
    platform: sf ? "snowflake" : "postgres",
    sk: sf ? "NUMBER(38,0) IDENTITY START 1 INCREMENT 1" : "BIGSERIAL",
    bigint: sf ? "NUMBER(38,0)" : "BIGINT",
    int: sf ? "NUMBER(10,0)" : "INTEGER",
    smallint: sf ? "NUMBER(5,0)" : "SMALLINT",
    text: sf ? "VARCHAR(16777216)" : "TEXT",
    varchar: (n) => (sf ? "VARCHAR(" + n + ")" : "VARCHAR(" + n + ")"),
    bool: "BOOLEAN",
    date: "DATE",
    ts: sf ? "TIMESTAMP_NTZ" : "TIMESTAMP",
    num: (p, s) => (sf ? "NUMBER(" + p + "," + s + ")" : "NUMERIC(" + p + "," + s + ")"),
    json: sf ? "VARIANT" : "JSONB",
    trueLit: sf ? "TRUE" : "TRUE",
  };
}

function modelCol(name, type, opts) {
  opts = opts || {};
  return {
    name: name,
    type: type,
    pk: !!opts.pk,
    fk: opts.fk || null, // { table, column }
    unique: !!opts.unique,
    notNull: opts.notNull !== false && (!!opts.pk || !!opts.unique || !!opts.notNull),
    check: opts.check || null,
    default: opts.default != null ? opts.default : null,
    castFrom: opts.castFrom || null, // source expression for load SQL
    note: opts.note || "",
  };
}

function attachModelSpec(obj, cols, extras) {
  extras = extras || {};
  obj.columns = cols;
  obj.primary_key = cols.filter((c) => c.pk).map((c) => c.name);
  obj.foreign_keys = cols
    .filter((c) => c.fk)
    .map((c) => ({
      column: c.name,
      ref_table: c.fk.table,
      ref_column: c.fk.column,
    }));
  obj.unique_keys = (extras.uniqueKeys || []).concat(
    cols.filter((c) => c.unique && !c.pk).map((c) => [c.name])
  );
  obj.checks = cols.filter((c) => c.check).map((c) => ({ column: c.name, expr: c.check }));
  if (extras.checks) obj.checks = obj.checks.concat(extras.checks);
  obj.indexes = extras.indexes || [];
  obj.cluster_by = extras.clusterBy || [];
  obj.load = extras.load || null;
  return obj;
}

function buildStandardModelObjects(scope, types, tables) {
  const has = (re) => tables.some((t) => re.test(t));
  const sourceSchema = scope.schema;
  const proposal = [];

  proposal.push(
    attachModelSpec(
      {
        id: "dim_date",
        kind: "dimension",
        name: "dim_date",
        selected: true,
        grain: "One row per calendar date",
        source: "generated calendar",
        note: "Conformed date dimension · PK date_key",
      },
      [
        modelCol("date_key", types.date, { pk: true, notNull: true }),
        modelCol("day_of_week", types.smallint, { notNull: true, check: "day_of_week BETWEEN 1 AND 7" }),
        modelCol("week_of_year", types.smallint, { notNull: true }),
        modelCol("month_num", types.smallint, { notNull: true, check: "month_num BETWEEN 1 AND 12" }),
        modelCol("quarter_num", types.smallint, { notNull: true, check: "quarter_num BETWEEN 1 AND 4" }),
        modelCol("year_num", types.int, { notNull: true }),
        modelCol("is_weekend", types.bool, { notNull: true, default: "FALSE" }),
        modelCol("_dh_loaded_at", types.ts, { notNull: true, default: "CURRENT_TIMESTAMP" }),
      ],
      { indexes: [["year_num", "month_num"]], clusterBy: ["date_key"] }
    )
  );

  proposal.push(
    attachModelSpec(
      {
        id: "dim_customer",
        kind: "dimension",
        name: "dim_customer",
        selected: true,
        grain: "One row per customer_id (SCD2)",
        source: has(/customer|cutomer/i) ? "customer table(s)" : "customer source (unresolved)",
        note: "Hub dimension · surrogate PK + natural key UNIQUE",
      },
      [
        modelCol("customer_key", types.sk, { pk: true, notNull: true }),
        modelCol("customer_id", types.varchar(64), {
          unique: true,
          notNull: true,
          castFrom: "CAST(src.customer_id AS " + types.varchar(64) + ")",
        }),
        modelCol("customer_nm", types.varchar(256), {
          castFrom: "CAST(COALESCE(src.customer_nm, src.first_name || ' ' || src.last_name) AS " + types.varchar(256) + ")",
        }),
        modelCol("email", types.varchar(320), { castFrom: "LOWER(CAST(src.email AS " + types.varchar(320) + "))" }),
        modelCol("phone", types.varchar(64), { castFrom: "CAST(src.phone AS " + types.varchar(64) + ")" }),
        modelCol("segment", types.varchar(64), { castFrom: "CAST(src.segment AS " + types.varchar(64) + ")" }),
        modelCol("account_status", types.varchar(64), {
          castFrom: "CAST(src.account_status AS " + types.varchar(64) + ")",
        }),
        modelCol("city", types.varchar(128), { castFrom: "CAST(src.city AS " + types.varchar(128) + ")" }),
        modelCol("state", types.varchar(64), { castFrom: "CAST(src.state AS " + types.varchar(64) + ")" }),
        modelCol("country", types.varchar(64), {
          notNull: true,
          default: "'US'",
          castFrom: "CAST(COALESCE(src.country, 'US') AS " + types.varchar(64) + ")",
        }),
        modelCol("effective_from", types.ts, { notNull: true, default: "CURRENT_TIMESTAMP" }),
        modelCol("effective_to", types.ts, {}),
        modelCol("is_current", types.bool, {
          notNull: true,
          default: types.trueLit,
          check: "is_current IN (TRUE, FALSE)",
        }),
        modelCol("_dh_loaded_at", types.ts, { notNull: true, default: "CURRENT_TIMESTAMP" }),
        modelCol("_dh_source_system", types.varchar(64), { notNull: true }),
      ],
      {
        uniqueKeys: [["customer_id", "effective_from"]],
        indexes: [["customer_id"], ["is_current"]],
        clusterBy: ["customer_id"],
        load: {
          sourceHint: "customer%|cutomer%",
          naturalKey: "customer_id",
        },
      }
    )
  );

  if (has(/geo|tower|household|address|region|store/i) || modelLayerFromSchema(sourceSchema) !== "bronze") {
    proposal.push(
      attachModelSpec(
        {
          id: "dim_geography",
          kind: "dimension",
          name: "dim_geography",
          selected: true,
          grain: "Surrogate geo_key",
          source: "address / store / region attributes",
          note: "Location conformed dimension",
        },
        [
          modelCol("geo_key", types.sk, { pk: true, notNull: true }),
          modelCol("city", types.varchar(128), {
            notNull: true,
            castFrom: "CAST(src.city AS " + types.varchar(128) + ")",
          }),
          modelCol("state", types.varchar(64), {
            notNull: true,
            castFrom: "CAST(src.state AS " + types.varchar(64) + ")",
          }),
          modelCol("zip", types.varchar(32), { castFrom: "CAST(src.zip AS " + types.varchar(32) + ")" }),
          modelCol("country", types.varchar(64), {
            notNull: true,
            default: "'US'",
            castFrom: "CAST(COALESCE(src.country, 'US') AS " + types.varchar(64) + ")",
          }),
          modelCol("region", types.varchar(64), {
            castFrom: "CAST(src.region AS " + types.varchar(64) + ")",
          }),
          modelCol("_dh_loaded_at", types.ts, { notNull: true, default: "CURRENT_TIMESTAMP" }),
        ],
        {
          uniqueKeys: [["city", "state", "zip", "country"]],
          indexes: [["state", "city"]],
          load: { sourceHint: "store%|geo%|address%|region%", naturalKey: null },
        }
      )
    );
  }

  if (has(/plan|package|product|contract|employee/i)) {
    proposal.push(
      attachModelSpec(
        {
          id: "dim_product",
          kind: "dimension",
          name: "dim_product",
          selected: true,
          grain: "One row per product/plan",
          source: "product / plan / package tables",
          note: "Conformed product dimension",
        },
        [
          modelCol("product_key", types.sk, { pk: true, notNull: true }),
          modelCol("product_id", types.varchar(64), {
            unique: true,
            notNull: true,
            castFrom: "CAST(src.product_id AS " + types.varchar(64) + ")",
          }),
          modelCol("product_name", types.varchar(256), {
            notNull: true,
            castFrom: "CAST(src.product_name AS " + types.varchar(256) + ")",
          }),
          modelCol("product_type", types.varchar(64), {
            castFrom: "CAST(src.product_type AS " + types.varchar(64) + ")",
          }),
          modelCol("monthly_fee_usd", types.num(12, 2), {
            check: "monthly_fee_usd IS NULL OR monthly_fee_usd >= 0",
            castFrom: "CAST(src.unit_price AS " + types.num(12, 2) + ")",
          }),
          modelCol("_dh_loaded_at", types.ts, { notNull: true, default: "CURRENT_TIMESTAMP" }),
        ],
        {
          indexes: [["product_type"]],
          load: { sourceHint: "product%", naturalKey: "product_id" },
        }
      )
    );
  }

  if (has(/channel|ticket|ivr|case/i)) {
    proposal.push(
      attachModelSpec(
        {
          id: "dim_channel",
          kind: "dimension",
          name: "dim_channel",
          selected: true,
          grain: "One row per channel code",
          source: "care / interaction tables",
          note: "Channel conformed dimension",
        },
        [
          modelCol("channel_key", types.sk, { pk: true, notNull: true }),
          modelCol("channel_code", types.varchar(64), {
            unique: true,
            notNull: true,
            castFrom: "CAST(src.preferred_channel AS " + types.varchar(64) + ")",
          }),
          modelCol("channel_name", types.varchar(128), {
            notNull: true,
            castFrom: "CAST(src.preferred_channel AS " + types.varchar(128) + ")",
          }),
          modelCol("channel_group", types.varchar(64), {
            castFrom: "CAST('fulfillment' AS " + types.varchar(64) + ")",
          }),
          modelCol("_dh_loaded_at", types.ts, { notNull: true, default: "CURRENT_TIMESTAMP" }),
        ],
        { load: { sourceHint: "customer%|channel%", naturalKey: "channel_code", distinctOn: "preferred_channel" } }
      )
    );
  }

  if (has(/invoice|payment|billing|ar_|order|sales/i)) {
    proposal.push(
      attachModelSpec(
        {
          id: "fact_invoice",
          kind: "fact",
          name: "fact_invoice",
          selected: true,
          grain: "One row per invoice_id",
          source: "invoice / billing / sales tables",
          note: "Degenerate invoice_id · FKs to customer + date",
        },
        [
          modelCol("invoice_key", types.sk, { pk: true, notNull: true }),
          modelCol("invoice_id", types.varchar(64), {
            unique: true,
            notNull: true,
            castFrom: "CAST(COALESCE(src.account_txn_id, src.order_id, src.sale_id, src.invoice_id) AS " + types.varchar(64) + ")",
          }),
          modelCol("customer_key", types.bigint, {
            notNull: true,
            fk: { table: "dim_customer", column: "customer_key" },
          }),
          modelCol("date_key", types.date, {
            notNull: true,
            fk: { table: "dim_date", column: "date_key" },
          }),
          modelCol("amount_due", types.num(14, 2), {
            notNull: true,
            default: "0",
            check: "amount_due >= 0",
            castFrom: "CAST(COALESCE(src.amount, src.gross_amount, src.amount_due, 0) AS " + types.num(14, 2) + ")",
          }),
          modelCol("tax_amount", types.num(14, 2), {
            notNull: true,
            default: "0",
            check: "tax_amount >= 0",
            castFrom: "CAST(COALESCE(src.tax_amount, 0) AS " + types.num(14, 2) + ")",
          }),
          modelCol("total_amount", types.num(14, 2), {
            notNull: true,
            default: "0",
            check: "total_amount >= 0",
            castFrom: "CAST(COALESCE(src.amount, src.net_amount, src.total_amount, src.gross_amount, 0) AS " + types.num(14, 2) + ")",
          }),
          modelCol("_dh_loaded_at", types.ts, { notNull: true, default: "CURRENT_TIMESTAMP" }),
          modelCol("_dh_source_system", types.varchar(64), { notNull: true }),
        ],
        {
          indexes: [["customer_key", "date_key"], ["date_key"]],
          clusterBy: ["date_key", "customer_key"],
          checks: [{ expr: "total_amount >= amount_due", column: "total_amount" }],
          load: {
            sourceHint: "account%|order%|sales%|invoice%|billing%",
            naturalKey: "invoice_id",
            customerIdCol: "customer_id",
            dateCol: "txn_ts|sale_ts|ordered_at|invoice_date|business_date",
          },
        }
      )
    );
  }

  if (has(/cdr|call|usage|bandwidth|qoe|session/i)) {
    proposal.push(
      attachModelSpec(
        {
          id: "fact_usage_daily",
          kind: "fact",
          name: "fact_usage_daily",
          selected: true,
          grain: "Customer + usage_date",
          source: "usage / CDR tables",
          note: "Additive measures · FKs customer/date/geo",
        },
        [
          modelCol("usage_key", types.sk, { pk: true, notNull: true }),
          modelCol("customer_key", types.bigint, {
            notNull: true,
            fk: { table: "dim_customer", column: "customer_key" },
          }),
          modelCol("date_key", types.date, {
            notNull: true,
            fk: { table: "dim_date", column: "date_key" },
          }),
          modelCol("geo_key", types.bigint, { fk: { table: "dim_geography", column: "geo_key" } }),
          modelCol("duration_sec", types.bigint, { notNull: true, default: "0", check: "duration_sec >= 0" }),
          modelCol("data_used_gb", types.num(14, 4), {
            notNull: true,
            default: "0",
            check: "data_used_gb >= 0",
          }),
          modelCol("event_count", types.bigint, { notNull: true, default: "0", check: "event_count >= 0" }),
          modelCol("_dh_loaded_at", types.ts, { notNull: true, default: "CURRENT_TIMESTAMP" }),
        ],
        {
          uniqueKeys: [["customer_key", "date_key"]],
          indexes: [["date_key"], ["customer_key"]],
          clusterBy: ["date_key"],
        }
      )
    );
  }

  if (has(/ticket|case|dispatch|ivr/i)) {
    proposal.push(
      attachModelSpec(
        {
          id: "fact_support_ticket",
          kind: "fact",
          name: "fact_support_ticket",
          selected: true,
          grain: "One row per ticket/case",
          source: "care / ticket tables",
          note: "Semi-additive resolution metrics",
        },
        [
          modelCol("ticket_key", types.sk, { pk: true, notNull: true }),
          modelCol("ticket_id", types.varchar(64), { unique: true, notNull: true }),
          modelCol("customer_key", types.bigint, {
            notNull: true,
            fk: { table: "dim_customer", column: "customer_key" },
          }),
          modelCol("channel_key", types.bigint, { fk: { table: "dim_channel", column: "channel_key" } }),
          modelCol("date_key", types.date, {
            notNull: true,
            fk: { table: "dim_date", column: "date_key" },
          }),
          modelCol("resolution_sec", types.bigint, { check: "resolution_sec IS NULL OR resolution_sec >= 0" }),
          modelCol("priority", types.varchar(32), {}),
          modelCol("_dh_loaded_at", types.ts, { notNull: true, default: "CURRENT_TIMESTAMP" }),
        ],
        { indexes: [["customer_key"], ["date_key", "priority"]] }
      )
    );
  }

  if (!proposal.some((p) => p.kind === "fact")) {
    const layer = modelLayerFromSchema(sourceSchema) || modelLayerFromSchema(scope.database);
    proposal.push(
      attachModelSpec(
        {
          id: "fact_activity",
          kind: "fact",
          name: "fact_" + (layer === "bronze" ? "staging_activity" : "activity"),
          selected: true,
          grain: "One row per source business event",
          source: sourceSchema + " tables",
          note: "Generic activity fact until domain tables are richer",
        },
        [
          modelCol("fact_key", types.sk, { pk: true, notNull: true }),
          modelCol("customer_key", types.bigint, { fk: { table: "dim_customer", column: "customer_key" } }),
          modelCol("date_key", types.date, {
            notNull: true,
            fk: { table: "dim_date", column: "date_key" },
          }),
          modelCol("measure_value", types.num(18, 4), { notNull: true, default: "0" }),
          modelCol("source_ref", types.varchar(256), {}),
          modelCol("_dh_loaded_at", types.ts, { notNull: true, default: "CURRENT_TIMESTAMP" }),
        ],
        { indexes: [["date_key"], ["customer_key"]] }
      )
    );
  }

  proposal.push({
    id: "vw_customer_360",
    kind: "view",
    name: "vw_customer_360",
    selected: true,
    grain: "One row per current customer",
    source: "dim_customer (+ optional facts)",
    note: "Serving view · filters is_current = TRUE",
    columns: [],
    primary_key: ["customer_id"],
    foreign_keys: [],
    unique_keys: [],
    checks: [],
    indexes: [],
  });
  proposal.push({
    id: "vw_daily_kpi",
    kind: "view",
    name: "vw_daily_kpi",
    selected: true,
    grain: "Date-level KPIs",
    source: "facts aggregated by dim_date",
    note: "Cast/aggregate measures for executives",
    columns: [],
    primary_key: ["date_key"],
    foreign_keys: [],
    unique_keys: [],
    checks: [],
    indexes: [],
  });
  if (proposal.some((p) => p.id === "fact_invoice")) {
    proposal.push({
      id: "vw_revenue_monthly",
      kind: "view",
      name: "vw_revenue_monthly",
      selected: true,
      grain: "Month + segment",
      source: "fact_invoice",
      note: "Monthly revenue mart with typed aggregates",
      columns: [],
      primary_key: ["month_start", "segment"],
      foreign_keys: [],
      unique_keys: [],
      checks: [],
      indexes: [],
    });
  }

  proposal.forEach((p) => {
    p.target_schema = scope.targetSchema;
    p.source_schema = sourceSchema;
    p.platform = types.platform;
  });
  return proposal;
}

async function enrichProposalFromSourceStructures(scope, proposal) {
  if (typeof DataHiveAssets === "undefined" || !scope.connectorId) return proposal;
  const sourceTables = modelState.catalogItems
    .filter(
      (a) =>
        String(a.schema || "").toLowerCase() === String(scope.schema || "").toLowerCase() &&
        a.name &&
        String(a.type || "Table") !== "Schema"
    )
    .slice(0, 12);
  const structures = {};
  await Promise.all(
    sourceTables.map(async (t) => {
      try {
        const st = await DataHiveAssets.structure(scope.schema, t.name, scope.connectorId);
        structures[String(t.name).toLowerCase()] = st;
      } catch (_err) {
        /* optional enrichment */
      }
    })
  );

  function bindSource(dimId, tableRe) {
    const tbl = Object.keys(structures).find((n) => tableRe.test(n));
    const dim = proposal.find((p) => p.id === dimId);
    if (!tbl || !dim || !structures[tbl] || !structures[tbl].columns) return;
    const srcCols = structures[tbl].columns || [];
    dim.source = scope.schema + "." + tbl;
    dim.source_table = tbl;
    dim.source_columns = srcCols.map((c) => ({
      name: c.name,
      type: c.type,
      primary_key: !!c.primary_key,
      nullable: c.nullable !== false,
    }));
    if (!dim.load) dim.load = {};
    dim.load.sourceHint = tbl;
    const byLower = {};
    srcCols.forEach((c) => {
      byLower[String(c.name).toLowerCase()] = c.name;
    });
    (dim.columns || []).forEach((col) => {
      const srcName = byLower[col.name.toLowerCase()];
      if (srcName) {
        col.castFrom = "CAST(src." + srcName + " AS " + col.type + ")";
      }
    });
  }

  bindSource("dim_customer", /customer|cutomer/i);
  bindSource("dim_product", /product|plan|package/i);
  bindSource("dim_geography", /store|geo|address|region/i);
  bindSource("dim_channel", /customer|cutomer|channel/i);

  const factInvoice = proposal.find((p) => p.id === "fact_invoice");
  if (factInvoice) {
    const factTbl = Object.keys(structures).find((n) =>
      /account|order|sales|invoice|billing/i.test(n)
    );
    if (factTbl) {
      factInvoice.source = scope.schema + "." + factTbl;
      factInvoice.source_table = factTbl;
      if (!factInvoice.load) factInvoice.load = {};
      factInvoice.load.sourceHint = factTbl;
    }
  }

  const customerTbl = Object.keys(structures).find((n) => /customer|cutomer/i.test(n));
  if (customerTbl) {
    const dim = proposal.find((p) => p.id === "dim_customer");
    if (dim) {
      const srcPk = (structures[customerTbl].columns || [])
        .filter((c) => c.primary_key)
        .map((c) => c.name);
      if (srcPk.length) {
        dim.note =
          (dim.note || "") +
          " · source PK: " +
          srcPk.join(", ") +
          " mapped to natural key / SCD2";
      }
    }
  }
  return proposal;
}

function proposeDimensionalModel(scope) {
  const tables = modelState.catalogItems
    .filter((a) => String(a.schema || "").toLowerCase() === String(scope.schema || "").toLowerCase())
    .map((a) => String(a.name || ""))
    .filter(Boolean);
  const types = modelTypes(modelPlatformOf(scope));
  return buildStandardModelObjects(scope, types, tables);
}

function renderModelProposal() {
  const list = $("#govModelProposalList");
  const summary = $("#govModelSummary");
  const lead = $("#govModelProposalLead");
  const items = modelState.proposal || [];
  const dims = items.filter((p) => p.kind === "dimension" && p.selected).length;
  const facts = items.filter((p) => p.kind === "fact" && p.selected).length;
  const views = items.filter((p) => p.kind === "view" && p.selected).length;
  const pkCount = items
    .filter((p) => p.selected)
    .reduce((n, p) => n + ((p.primary_key && p.primary_key.length) || 0), 0);
  const fkCount = items
    .filter((p) => p.selected)
    .reduce((n, p) => n + ((p.foreign_keys && p.foreign_keys.length) || 0), 0);
  if (summary) {
    summary.innerHTML =
      '<span class="chip">' + dims + " dimensions</span>" +
      '<span class="chip">' + facts + " facts</span>" +
      '<span class="chip">' + views + " views</span>" +
      '<span class="chip">' + pkCount + " PK cols</span>" +
      '<span class="chip">' + fkCount + " FKs</span>";
  }
  const connector = $("#govModelConnector");
  const schema = $("#govModelSchema");
  const database = $("#govModelDatabase");
  const target = $("#govModelTargetSchema");
  const platform = modelPlatformOf(collectModelScope());
  if (lead) {
    lead.textContent =
      "Scope: " +
      ((connector && connector.selectedOptions[0] && connector.selectedOptions[0].textContent) || "connector") +
      " / " +
      ((database && database.value) || "—") +
      " / " +
      ((schema && schema.value) || "—") +
      " → target " +
      ((target && target.value) || "gold") +
      " · dialect " +
      platform +
      ". Review PK/FK/types; uncheck objects to exclude from DDL.";
  }
  if (!list) return;
  list.innerHTML = items
    .map((p) => {
      const cols = (p.columns || []).slice(0, 14);
      const colHtml = cols.length
        ? '<div class="gov-model-cols">' +
          cols
            .map((c) => {
              const tags = [];
              if (c.pk) tags.push('<span class="gov-model-tag pk">PK</span>');
              if (c.fk) tags.push('<span class="gov-model-tag fk">FK → ' + escapeHtml(c.fk.table) + "</span>");
              if (c.unique) tags.push('<span class="gov-model-tag uq">UQ</span>');
              if (c.notNull) tags.push('<span class="gov-model-tag nn">NN</span>');
              if (c.check) tags.push('<span class="gov-model-tag ck">CHECK</span>');
              return (
                '<div class="gov-model-col">' +
                '<span class="col-name">' +
                escapeHtml(c.name) +
                "</span>" +
                '<span class="col-type">' +
                escapeHtml(c.type) +
                "</span>" +
                tags.join("") +
                "</div>"
              );
            })
            .join("") +
          (p.columns.length > cols.length
            ? '<div class="gov-model-col"><span class="col-type">+' +
              (p.columns.length - cols.length) +
              " more columns…</span></div>"
            : "") +
          "</div>"
        : "";
      const fkList = (p.foreign_keys || [])
        .map((f) => f.column + " → " + f.ref_table + "." + f.ref_column)
        .join("; ");
      const uqList = (p.unique_keys || []).map((u) => (Array.isArray(u) ? u.join(", ") : u)).join(" | ");
      const constraintHtml =
        fkList || uqList || (p.primary_key && p.primary_key.length)
          ? '<div class="gov-model-constraints">' +
            (p.primary_key && p.primary_key.length
              ? "<div>PK: " + escapeHtml(p.primary_key.join(", ")) + "</div>"
              : "") +
            (uqList ? "<div>UNIQUE: " + escapeHtml(uqList) + "</div>" : "") +
            (fkList ? "<div>FK: " + escapeHtml(fkList) + "</div>" : "") +
            "</div>"
          : "";
      return (
        '<label class="gov-model-item">' +
        '<input type="checkbox" data-model-obj="' +
        escapeHtml(p.id) +
        '"' +
        (p.selected ? " checked" : "") +
        " />" +
        "<div>" +
        '<div class="nm">' +
        escapeHtml(p.name) +
        "</div>" +
        '<div class="meta">' +
        escapeHtml(p.grain) +
        (p.source ? " · source: " + escapeHtml(p.source) : "") +
        (p.note ? " — " + escapeHtml(p.note) : "") +
        "</div>" +
        colHtml +
        constraintHtml +
        '<span class="kind">' +
        escapeHtml(p.kind) +
        "</span>" +
        "</div></label>"
      );
    })
    .join("");
}

function modelFqName(schema, name) {
  return quoteModelIdent(schema) + "." + quoteModelIdent(name);
}

function renderModelColumnDdl(col, platform) {
  let line = "  " + quoteModelIdent(col.name) + " " + col.type;
  // IDENTITY/BIGSERIAL already imply key generation; avoid duplicate NULL specs awkwardly
  if (col.notNull && !/IDENTITY|BIGSERIAL/i.test(col.type)) line += " NOT NULL";
  if (col.default != null && !col.pk) line += " DEFAULT " + col.default;
  return line;
}

function modelTargetSchemaExists(scope, targetSchema) {
  const target = String(targetSchema || "").toLowerCase();
  if (!target) return false;
  const targetShort = target.indexOf(".") >= 0 ? target.split(".").pop() : target;
  const schemas = new Set();
  (modelState.catalogItems || []).forEach((a) => {
    if (a && a.schema) schemas.add(String(a.schema).toLowerCase());
  });
  // Also treat selected source schema list from UI options if present
  const schemaSel = $("#govModelTargetSchema");
  if (schemaSel) {
    Array.from(schemaSel.options || []).forEach((opt) => {
      if (opt && opt.value) schemas.add(String(opt.value).toLowerCase());
    });
  }
  for (const s of schemas) {
    if (!s) continue;
    if (s === target) return true;
    const short = s.indexOf(".") >= 0 ? s.split(".").pop() : s;
    if (short === targetShort) return true;
  }
  return false;
}

function generateModelDdl(proposal, scope) {
  const target = scope.targetSchema || "gold";
  const source = scope.schema;
  const platform = modelPlatformOf(scope);
  const types = modelTypes(platform);
  const selected = proposal.filter((p) => p.selected);
  const selectedIds = new Set(selected.map((p) => p.id));
  const lines = [
    "-- DataHive dimensional model DDL + load skeleton",
    "-- Connector : " + scope.connectorName,
    "-- Platform  : " + platform,
    "-- Database/layer : " + scope.database,
    "-- Source schema : " + source,
    "-- Target schema : " + target,
    "-- Includes  : PK, FK, UNIQUE, CHECK, indexes/clustering, typed columns, casted loads",
    "-- Generated : " + new Date().toISOString(),
    "",
  ];
  const targetExists = modelTargetSchemaExists(scope, target);
  const dbName = scope.database || (String(target).indexOf(".") >= 0 ? String(target).split(".")[0] : "");
  if (platform === "snowflake") {
    lines.push("-- Ensure session context before running:");
    if (dbName) {
      lines.push("USE DATABASE " + quoteModelIdent(dbName) + ";");
    }
    if (targetExists) {
      lines.push(
        "USE SCHEMA " + quoteModelIdent(String(target).indexOf(".") >= 0 ? String(target).split(".").pop() : target) + ";",
        "-- Target schema already exists — CREATE SCHEMA skipped (avoids CREATE SCHEMA privilege)."
      );
    } else {
      lines.push(
        "-- Target schema was not found in catalog. Either pick an existing schema as Target,",
        "-- or have ACCOUNTADMIN grant CREATE SCHEMA, then uncomment:",
        "-- GRANT USAGE ON DATABASE " + quoteModelIdent(dbName || "SALES_DB") + " TO ROLE DEV_ADMIN_ROLE;",
        "-- GRANT CREATE SCHEMA ON DATABASE " + quoteModelIdent(dbName || "SALES_DB") + " TO ROLE DEV_ADMIN_ROLE;",
        "-- CREATE SCHEMA IF NOT EXISTS " + quoteModelIdent(target) + ";",
        "-- Until then, create tables only in a schema your role can write (e.g. RAW)."
      );
    }
    lines.push("");
  } else if (!targetExists) {
    lines.push(
      "-- CREATE SCHEMA IF NOT EXISTS " + quoteModelIdent(target) + ";",
      "-- Uncomment above if the target schema does not exist yet.",
      ""
    );
  } else {
    lines.push("-- Target schema exists: " + target, "");
  }

  // CREATE TABLES
  selected
    .filter((p) => p.kind === "dimension" || p.kind === "fact")
    .forEach((p) => {
      const cols = p.columns || [];
      lines.push("-- ------------------------------------------------------------");
      lines.push("-- " + p.kind.toUpperCase() + ": " + p.name + " (" + p.grain + ")");
      if (p.source) lines.push("-- Source: " + p.source);
      lines.push("CREATE TABLE IF NOT EXISTS " + modelFqName(target, p.name) + " (");
      const body = cols.map((c) => renderModelColumnDdl(c, platform));
      // table-level PK
      if (p.primary_key && p.primary_key.length) {
        body.push(
          "  CONSTRAINT " +
            quoteModelIdent("pk_" + p.name) +
            " PRIMARY KEY (" +
            p.primary_key.map(quoteModelIdent).join(", ") +
            ")"
        );
      }
      (p.unique_keys || []).forEach((uq, i) => {
        const colsU = Array.isArray(uq) ? uq : [uq];
        body.push(
          "  CONSTRAINT " +
            quoteModelIdent("uq_" + p.name + "_" + (i + 1)) +
            " UNIQUE (" +
            colsU.map(quoteModelIdent).join(", ") +
            ")"
        );
      });
      (p.checks || []).forEach((ck, i) => {
        let expr = typeof ck === "string" ? ck : ck.expr;
        if (!expr) return;
        // Quote every known column ref so CHECK matches quoted DDL idents
        // (Snowflake folds unquoted total_amount → TOTAL_AMOUNT).
        const colNames = (cols || []).map((c) => c.name).filter(Boolean);
        if (ck && ck.column && colNames.indexOf(ck.column) < 0) colNames.push(ck.column);
        colNames
          .slice()
          .sort((a, b) => b.length - a.length)
          .forEach((cn) => {
            const re = new RegExp(
              "\\b" + String(cn).replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b",
              "g"
            );
            expr = expr.replace(re, quoteModelIdent(cn));
          });
        body.push(
          "  CONSTRAINT " +
            quoteModelIdent("ck_" + p.name + "_" + (i + 1)) +
            " CHECK (" +
            expr +
            ")"
        );
      });
      lines.push(body.join(",\n"));
      lines.push(");");
      lines.push("");
    });

  // Foreign keys (after all tables exist) — re-run safe per platform
  lines.push("-- Foreign keys (re-run safe)");
  selected
    .filter((p) => p.kind === "dimension" || p.kind === "fact")
    .forEach((p) => {
      (p.foreign_keys || []).forEach((fk, i) => {
        if (!selectedIds.has(fk.ref_table) && !selected.some((x) => x.name === fk.ref_table)) {
          lines.push(
            "-- skipped FK " +
              p.name +
              "." +
              fk.column +
              " → " +
              fk.ref_table +
              " (target not selected)"
          );
          return;
        }
        const cname = "fk_" + p.name + "_" + fk.column;
        const fqTable = modelFqName(target, p.name);
        const addFk =
          "ALTER TABLE " +
          fqTable +
          " ADD CONSTRAINT " +
          quoteModelIdent(cname) +
          " FOREIGN KEY (" +
          quoteModelIdent(fk.column) +
          ") REFERENCES " +
          modelFqName(target, fk.ref_table) +
          " (" +
          quoteModelIdent(fk.ref_column) +
          ");";
        if (platform === "snowflake") {
          // Snowflake has no DROP CONSTRAINT IF EXISTS — use scripting exception handler.
          lines.push(
            "BEGIN",
            "  ALTER TABLE " + fqTable + " DROP CONSTRAINT " + quoteModelIdent(cname) + ";",
            "EXCEPTION",
            "  WHEN OTHER THEN NULL;",
            "END;",
            addFk
          );
        } else {
          lines.push(
            "ALTER TABLE " + fqTable + " DROP CONSTRAINT IF EXISTS " + quoteModelIdent(cname) + ";",
            addFk
          );
        }
      });
    });
  lines.push("");

  // Indexes / clustering
  lines.push("-- Indexes / clustering");
  selected
    .filter((p) => p.kind === "dimension" || p.kind === "fact")
    .forEach((p) => {
      (p.indexes || []).forEach((idx, i) => {
        const cols = Array.isArray(idx) ? idx : [idx];
        const iname = "ix_" + p.name + "_" + (i + 1);
        if (platform === "snowflake") {
          lines.push(
            "-- Snowflake: consider CLUSTER BY / search optimization instead of B-tree indexes"
          );
          lines.push(
            "-- ALTER TABLE " +
              modelFqName(target, p.name) +
              " CLUSTER BY (" +
              cols.map(quoteModelIdent).join(", ") +
              ");"
          );
        } else {
          lines.push(
            "CREATE INDEX IF NOT EXISTS " +
              quoteModelIdent(iname) +
              " ON " +
              modelFqName(target, p.name) +
              " (" +
              cols.map(quoteModelIdent).join(", ") +
              ");"
          );
        }
      });
      if (platform === "snowflake" && p.cluster_by && p.cluster_by.length) {
        lines.push(
          "ALTER TABLE " +
            modelFqName(target, p.name) +
            " CLUSTER BY (" +
            p.cluster_by.map(quoteModelIdent).join(", ") +
            ");"
        );
      }
    });
  lines.push("");

  // Views
  selected
    .filter((p) => p.kind === "view")
    .forEach((p) => {
      lines.push("-- VIEW: " + p.name + " (" + p.grain + ")");
      if (p.id === "vw_customer_360") {
        lines.push(
          "CREATE OR REPLACE VIEW " + modelFqName(target, p.name) + " AS",
          "SELECT",
          "  c." + quoteModelIdent("customer_id") + ",",
          "  c." + quoteModelIdent("customer_nm") + ",",
          "  c." + quoteModelIdent("email") + ",",
          "  c." + quoteModelIdent("segment") + ",",
          "  c." + quoteModelIdent("account_status") + ",",
          "  c." + quoteModelIdent("city") + ",",
          "  c." + quoteModelIdent("state") + ",",
          "  c." + quoteModelIdent("country") + ",",
          "  c." + quoteModelIdent("effective_from") + ",",
          "  c." + quoteModelIdent("is_current"),
          "FROM " + modelFqName(target, "dim_customer") + " c",
          "WHERE c." + quoteModelIdent("is_current") + " = TRUE;",
          ""
        );
      } else if (p.id === "vw_daily_kpi") {
        const usage = selected.some((x) => x.id === "fact_usage_daily");
        const invoice = selected.some((x) => x.id === "fact_invoice");
        lines.push("CREATE OR REPLACE VIEW " + modelFqName(target, p.name) + " AS");
        lines.push("SELECT");
        lines.push("  d." + quoteModelIdent("date_key") + ",");
        lines.push(
          usage
            ? "  CAST(COALESCE(u.events, 0) AS " + types.bigint + ") AS usage_events,"
            : "  CAST(0 AS " + types.bigint + ") AS usage_events,"
        );
        lines.push(
          invoice
            ? "  CAST(COALESCE(i.revenue, 0) AS " + types.num(18, 2) + ") AS revenue_amount"
            : "  CAST(0 AS " + types.num(18, 2) + ") AS revenue_amount"
        );
        lines.push("FROM " + modelFqName(target, "dim_date") + " d");
        if (usage) {
          lines.push(
            "LEFT JOIN (",
            "  SELECT " +
              quoteModelIdent("date_key") +
              ", SUM(" +
              quoteModelIdent("event_count") +
              ") AS events",
            "  FROM " + modelFqName(target, "fact_usage_daily"),
            "  GROUP BY 1",
            ") u ON u." +
              quoteModelIdent("date_key") +
              " = d." +
              quoteModelIdent("date_key")
          );
        }
        if (invoice) {
          lines.push(
            "LEFT JOIN (",
            "  SELECT " +
              quoteModelIdent("date_key") +
              ", SUM(" +
              quoteModelIdent("total_amount") +
              ") AS revenue",
            "  FROM " + modelFqName(target, "fact_invoice"),
            "  GROUP BY 1",
            ") i ON i." +
              quoteModelIdent("date_key") +
              " = d." +
              quoteModelIdent("date_key")
          );
        }
        lines.push(";", "");
      } else if (p.id === "vw_revenue_monthly") {
        const monthExpr =
          platform === "snowflake"
            ? "DATE_TRUNC('MONTH', d." + quoteModelIdent("date_key") + ")::DATE"
            : "date_trunc('month', d." + quoteModelIdent("date_key") + ")::date";
        lines.push(
          "CREATE OR REPLACE VIEW " + modelFqName(target, p.name) + " AS",
          "SELECT",
          "  " + monthExpr + " AS month_start,",
          "  c." + quoteModelIdent("segment") + ",",
          "  CAST(SUM(f." +
            quoteModelIdent("total_amount") +
            ") AS " +
            types.num(18, 2) +
            ") AS revenue_amount,",
          "  CAST(COUNT(*) AS " + types.bigint + ") AS invoice_count",
          "FROM " + modelFqName(target, "fact_invoice") + " f",
          "JOIN " +
            modelFqName(target, "dim_date") +
            " d ON d." +
            quoteModelIdent("date_key") +
            " = f." +
            quoteModelIdent("date_key"),
          "JOIN " +
            modelFqName(target, "dim_customer") +
            " c ON c." +
            quoteModelIdent("customer_key") +
            " = f." +
            quoteModelIdent("customer_key"),
          "GROUP BY 1, 2;",
          ""
        );
      } else {
        lines.push(
          "CREATE OR REPLACE VIEW " + modelFqName(target, p.name) + " AS",
          "SELECT CAST(1 AS " + types.int + ") AS placeholder WHERE 1 = 0;",
          ""
        );
      }
    });

  lines.push(
    "-- ============================================================",
    "-- Ingestion SQL is generated separately in the Data ingestion panel.",
    "-- Run that script after this DDL to load source → model tables.",
    "-- ============================================================",
    "",
    "-- Validation checklist",
    "-- 1) Every table has a PRIMARY KEY",
    "-- 2) Fact FK columns reference dimension PKs",
    "-- 3) Natural keys have UNIQUE constraints",
    "-- 4) Measures/status columns have CHECK constraints where applicable",
    "-- 5) Ingestion script uses explicit CAST / TRY_CAST for type safety",
    "-- 6) Prefer TRY_CAST on Snowflake dirty RAW sources"
  );
  return lines.join("\n");
}

function modelIsValidSourceTableName(name) {
  const n = String(name || "").trim();
  if (!n) return false;
  if (n === "*" || n === "%" || n === "." || n.indexOf("*") >= 0) return false;
  if (/\s/.test(n)) return false;
  // Skip model objects already landed in the same schema
  if (/^(dim_|fact_|vw_)/i.test(n)) return false;
  if (/^(CURATED|ENRICHED|MART)$/i.test(n)) return false;
  return /^[A-Za-z_][A-Za-z0-9_$]*$/.test(n);
}

function modelSourceTableNames(scope) {
  const schema = String((scope && scope.schema) || "").toLowerCase();
  return (modelState.catalogItems || [])
    .filter((a) => {
      if (!a || !a.name) return false;
      if (String(a.type || "") === "Schema") return false;
      if (!modelIsValidSourceTableName(a.name)) return false;
      const sch = String(a.schema || "").toLowerCase();
      if (sch === schema) return true;
      const short = schema.indexOf(".") >= 0 ? schema.split(".").pop() : schema;
      return sch === short || sch.endsWith("." + short);
    })
    .map((a) => String(a.name));
}

function modelMatchSourceTable(tables, hint) {
  if (!tables || !tables.length) return null;
  const parts = String(hint || "")
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);
  for (let i = 0; i < parts.length; i++) {
    // LIKE-style wildcards: % → .* (substring-friendly for DH_POC_* names)
    const pat = parts[i]
      .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
      .replace(/%/g, ".*");
    if (pat === ".*" || pat === "") continue;
    const re = new RegExp(pat, "i");
    const hit = tables.find((t) => modelIsValidSourceTableName(t) && re.test(t));
    if (hit) return hit;
  }
  return null;
}

function modelSourceFqName(scope, tableName) {
  const platform = modelPlatformOf(scope);
  const schema = String(scope.schema || "");
  if (!modelIsValidSourceTableName(tableName)) {
    return "-- <set source table in " + schema + ">";
  }
  if (platform === "snowflake") {
    if (schema.indexOf(".") >= 0) {
      return schema
        .split(".")
        .map(quoteModelIdent)
        .concat([quoteModelIdent(tableName)])
        .join(".");
    }
    if (scope.database) {
      return (
        quoteModelIdent(scope.database) +
        "." +
        quoteModelIdent(schema) +
        "." +
        quoteModelIdent(tableName)
      );
    }
  }
  return quoteModelIdent(schema) + "." + quoteModelIdent(tableName);
}

function modelResolveSourceTable(obj, scope) {
  if (obj && modelIsValidSourceTableName(obj.source_table)) {
    return obj.source_table;
  }
  // Only treat obj.source as FQN when the last segment is a real table name
  // (never "SALES_DB.RAW.*" style placeholders).
  if (obj && obj.source && /\./.test(obj.source) && !/\s/.test(obj.source)) {
    const parts = String(obj.source).split(".").filter(Boolean);
    const last = parts[parts.length - 1];
    if (modelIsValidSourceTableName(last)) return last;
  }
  const tables = modelSourceTableNames(scope);
  const hint =
    (obj && obj.load && obj.load.sourceHint) ||
    (obj && obj.id === "dim_customer"
      ? "customer%|cutomer%"
      : obj && obj.id === "dim_product"
        ? "product%|plan%|package%"
        : obj && obj.id === "dim_geography"
          ? "store%|geo%|address%|region%"
          : obj && obj.id === "dim_channel"
            ? "customer%|cutomer%|channel%"
            : obj && obj.kind === "fact"
              ? "account%|order%|sales%|invoice%|usage%|ticket%|cdr%"
              : "");
  const matched = modelMatchSourceTable(tables, hint);
  if (matched) return matched;
  return null;
}

function modelCastExpr(col, platform) {
  if (col.castFrom) {
    if (platform === "snowflake") {
      return String(col.castFrom).replace(/\bCAST\s*\(/gi, "TRY_CAST(");
    }
    return col.castFrom;
  }
  const castFn = platform === "snowflake" ? "TRY_CAST" : "CAST";
  return castFn + "(src." + col.name + " AS " + col.type + ")";
}

function modelIngestSelectCols(obj, platform, sourceSystemLit) {
  const cols = (obj.columns || []).filter(
    (c) => !c.pk && !/IDENTITY|BIGSERIAL/i.test(c.type)
  );
  return cols.map((c) => {
    if (c.name === "_dh_loaded_at") {
      return "CURRENT_TIMESTAMP AS " + quoteModelIdent(c.name);
    }
    if (c.name === "_dh_source_system") {
      return sourceSystemLit + " AS " + quoteModelIdent(c.name);
    }
    if (c.name === "effective_from") {
      return "CURRENT_TIMESTAMP AS " + quoteModelIdent(c.name);
    }
    if (c.name === "effective_to") {
      return "CAST(NULL AS " + c.type + ") AS " + quoteModelIdent(c.name);
    }
    if (c.name === "is_current") {
      return "TRUE AS " + quoteModelIdent(c.name);
    }
    // FK surrogate keys filled later for facts
    if (c.fk) {
      return null;
    }
    return modelCastExpr(c, platform) + " AS " + quoteModelIdent(c.name);
  }).filter(Boolean);
}

function generateModelIngestionScript(proposal, scope) {
  const target = scope.targetSchema || "gold";
  const source = scope.schema;
  const platform = modelPlatformOf(scope);
  const types = modelTypes(platform);
  const selected = proposal.filter((p) => p.selected);
  const sourceSystemLit =
    "'" + String(scope.connectorName || scope.connectorId || "datahive").replace(/'/g, "''") + "'";
  const lines = [
    "-- DataHive dimensional model — data ingestion script",
    "-- Connector : " + scope.connectorName,
    "-- Platform  : " + platform,
    "-- Source    : " + source,
    "-- Target    : " + target,
    "-- Order     : dim_date → dimensions → facts",
    "-- Generated : " + new Date().toISOString(),
    "",
    "-- Prerequisites: run Model DDL first.",
    platform === "snowflake"
      ? "-- USE DATABASE " + quoteModelIdent(scope.database || "SALES_DB") + ";"
      : "-- SET search_path TO " + quoteModelIdent(target) + ";",
    "",
  ];

  // 1) dim_date seed
  if (selected.some((p) => p.id === "dim_date")) {
    lines.push("-- ------------------------------------------------------------");
    lines.push("-- Seed dim_date (730-day window ending today)");
    lines.push("-- ------------------------------------------------------------");
    const dateCols = [
      "date_key",
      "day_of_week",
      "week_of_year",
      "month_num",
      "quarter_num",
      "year_num",
      "is_weekend",
      "_dh_loaded_at",
    ];
    if (platform === "snowflake") {
      // Quote column idents to match DDL ("day_of_week"), not Snowflake's uppercase fold (DAY_OF_WEEK).
      lines.push(
        "INSERT INTO " + modelFqName(target, "dim_date"),
        "  (" + dateCols.map(quoteModelIdent).join(", ") + ")",
        "SELECT",
        "  d." + quoteModelIdent("date_key") + ",",
        "  DAYOFWEEKISO(d." + quoteModelIdent("date_key") + ") AS " + quoteModelIdent("day_of_week") + ",",
        "  WEEKISO(d." + quoteModelIdent("date_key") + ") AS " + quoteModelIdent("week_of_year") + ",",
        "  MONTH(d." + quoteModelIdent("date_key") + ") AS " + quoteModelIdent("month_num") + ",",
        "  QUARTER(d." + quoteModelIdent("date_key") + ") AS " + quoteModelIdent("quarter_num") + ",",
        "  YEAR(d." + quoteModelIdent("date_key") + ") AS " + quoteModelIdent("year_num") + ",",
        "  IFF(DAYOFWEEKISO(d." +
          quoteModelIdent("date_key") +
          ") IN (6, 7), TRUE, FALSE) AS " +
          quoteModelIdent("is_weekend") +
          ",",
        "  CURRENT_TIMESTAMP AS " + quoteModelIdent("_dh_loaded_at"),
        "FROM (",
        "  SELECT DATEADD('day', -SEQ4(), CURRENT_DATE()) AS " + quoteModelIdent("date_key"),
        "  FROM TABLE(GENERATOR(ROWCOUNT => 730))",
        ") d",
        "WHERE NOT EXISTS (",
        "  SELECT 1 FROM " +
          modelFqName(target, "dim_date") +
          " x WHERE x." +
          quoteModelIdent("date_key") +
          " = d." +
          quoteModelIdent("date_key"),
        ");",
        ""
      );
    } else {
      lines.push(
        "INSERT INTO " + modelFqName(target, "dim_date"),
        "  (" + dateCols.map(quoteModelIdent).join(", ") + ")",
        "SELECT",
        "  d::date AS " + quoteModelIdent("date_key") + ",",
        "  EXTRACT(ISODOW FROM d)::smallint AS " + quoteModelIdent("day_of_week") + ",",
        "  EXTRACT(WEEK FROM d)::smallint AS " + quoteModelIdent("week_of_year") + ",",
        "  EXTRACT(MONTH FROM d)::smallint AS " + quoteModelIdent("month_num") + ",",
        "  EXTRACT(QUARTER FROM d)::smallint AS " + quoteModelIdent("quarter_num") + ",",
        "  EXTRACT(YEAR FROM d)::integer AS " + quoteModelIdent("year_num") + ",",
        "  (EXTRACT(ISODOW FROM d) IN (6, 7)) AS " + quoteModelIdent("is_weekend") + ",",
        "  CURRENT_TIMESTAMP AS " + quoteModelIdent("_dh_loaded_at"),
        "FROM generate_series(CURRENT_DATE - 729, CURRENT_DATE, '1 day'::interval) AS g(d)",
        "WHERE NOT EXISTS (",
        "  SELECT 1 FROM " +
          modelFqName(target, "dim_date") +
          " x WHERE x." +
          quoteModelIdent("date_key") +
          " = d::date",
        ");",
        ""
      );
    }
  }

  // 2) Dimensions (except date)
  selected
    .filter((p) => p.kind === "dimension" && p.id !== "dim_date")
    .forEach((p) => {
      const srcTable = modelResolveSourceTable(p, scope);
      const srcFq = modelSourceFqName(scope, srcTable);
      const naturalKey = (p.load && p.load.naturalKey) || null;
      const selectCols = modelIngestSelectCols(p, platform, sourceSystemLit);
      const insertCols = (p.columns || [])
        .filter((c) => !c.pk && !/IDENTITY|BIGSERIAL/i.test(c.type) && !c.fk)
        .map((c) => c.name);

      lines.push("-- ------------------------------------------------------------");
      lines.push("-- Ingest " + p.name + (srcTable ? " ← " + srcFq : " ← (set source table)"));
      lines.push("-- ------------------------------------------------------------");
      if (!srcTable) {
        lines.push(
          "-- WARNING: no source table matched for " + p.name + ".",
          "-- Set load.sourceHint / source_table, then regenerate ingestion.",
          ""
        );
        return;
      }

      if (p.id === "dim_channel") {
        const channelExpr =
          platform === "snowflake"
            ? "TRY_CAST(src.PREFERRED_CHANNEL AS " + types.varchar(64) + ")"
            : "CAST(src.preferred_channel AS " + types.varchar(64) + ")";
        lines.push(
          "INSERT INTO " + modelFqName(target, p.name),
          "  (" + ["channel_code", "channel_name", "channel_group", "_dh_loaded_at"].map(quoteModelIdent).join(", ") + ")",
          "SELECT DISTINCT",
          "  " + channelExpr + " AS channel_code,",
          "  " + channelExpr + " AS channel_name,",
          "  CAST('fulfillment' AS " + types.varchar(64) + ") AS channel_group,",
          "  CURRENT_TIMESTAMP AS _dh_loaded_at",
          "FROM " + srcFq + " src",
          "WHERE " + (platform === "snowflake" ? "src.PREFERRED_CHANNEL" : "src.preferred_channel") + " IS NOT NULL",
          "  AND NOT EXISTS (",
          "    SELECT 1 FROM " + modelFqName(target, p.name) + " d",
          "    WHERE d." + quoteModelIdent("channel_code") + " = " + channelExpr,
          "  );",
          ""
        );
        return;
      }

      if (platform === "snowflake" && naturalKey) {
        const updateCols = insertCols.filter(
          (n) => !["effective_from", "effective_to", "is_current", naturalKey].includes(n)
        );
        lines.push("MERGE INTO " + modelFqName(target, p.name) + " AS tgt");
        lines.push("USING (");
        lines.push("  SELECT");
        selectCols.forEach((expr, idx) => {
          lines.push("    " + expr + (idx < selectCols.length - 1 ? "," : ""));
        });
        lines.push("  FROM " + srcFq + " src");
        lines.push(") AS src");
        lines.push(
          "ON tgt." +
            quoteModelIdent(naturalKey) +
            " = src." +
            quoteModelIdent(naturalKey) +
            (insertCols.indexOf("is_current") >= 0
              ? " AND tgt." + quoteModelIdent("is_current") + " = TRUE"
              : "")
        );
        if (updateCols.length) {
          lines.push("WHEN MATCHED THEN UPDATE SET");
          updateCols.forEach((n, idx) => {
            lines.push(
              "  tgt." +
                quoteModelIdent(n) +
                " = src." +
                quoteModelIdent(n) +
                (idx < updateCols.length - 1 ? "," : "")
            );
          });
        }
        lines.push("WHEN NOT MATCHED THEN INSERT (");
        lines.push("  " + insertCols.map(quoteModelIdent).join(", "));
        lines.push(") VALUES (");
        lines.push("  " + insertCols.map((n) => "src." + quoteModelIdent(n)).join(", "));
        lines.push(");");
        lines.push("");
      } else {
        const nkCol = (p.columns || []).find((c) => c.name === naturalKey);
        const nkExpr = naturalKey
          ? modelCastExpr(nkCol || { name: naturalKey, type: types.varchar(64), castFrom: null }, platform)
          : null;
        lines.push(
          "INSERT INTO " + modelFqName(target, p.name),
          "  (" + insertCols.map(quoteModelIdent).join(", ") + ")",
          "SELECT"
        );
        selectCols.forEach((expr, idx) => {
          lines.push("  " + expr + (idx < selectCols.length - 1 ? "," : ""));
        });
        lines.push("FROM " + srcFq + " src");
        if (naturalKey && nkExpr) {
          lines.push(
            "WHERE NOT EXISTS (",
            "  SELECT 1 FROM " + modelFqName(target, p.name) + " d",
            "  WHERE d." + quoteModelIdent(naturalKey) + " = (" + nkExpr + ")",
            ");"
          );
        } else {
          lines.push(";");
        }
        lines.push("");
      }
    });

  // 3) Facts with dimension key lookups
  selected
    .filter((p) => p.kind === "fact")
    .forEach((p) => {
      const srcTable = modelResolveSourceTable(p, scope);
      const srcFq = modelSourceFqName(scope, srcTable);
      const load = p.load || {};
      const naturalKey = load.naturalKey || null;
      const custCol = load.customerIdCol || "customer_id";
      const dateCols = String(load.dateCol || "txn_ts|sale_ts|ordered_at|created_at|business_date").split("|");

      lines.push("-- ------------------------------------------------------------");
      lines.push("-- Ingest " + p.name + (srcTable ? " ← " + srcFq : " ← (set source table)"));
      lines.push("-- ------------------------------------------------------------");
      if (!srcTable) {
        lines.push(
          "-- WARNING: no source table matched for " + p.name + ".",
          "-- Set load.sourceHint / source_table, then regenerate ingestion.",
          ""
        );
        return;
      }

      const dateExprParts = dateCols.map((c) =>
        platform === "snowflake"
          ? "TRY_TO_TIMESTAMP(TO_VARCHAR(src." + c.toUpperCase() + "))"
          : "src." + c + "::timestamp"
      );
      const dateTs =
        platform === "snowflake"
          ? "COALESCE(" + dateExprParts.join(", ") + ", CURRENT_TIMESTAMP())"
          : "COALESCE(" + dateExprParts.join(", ") + ", CURRENT_TIMESTAMP)";
      const dateKeyExpr =
        platform === "snowflake"
          ? "CAST(" + dateTs + " AS DATE)"
          : "(" + dateTs + ")::date";

      const insertCols = [];
      const selectExprs = [];
      (p.columns || []).forEach((c) => {
        if (c.pk || /IDENTITY|BIGSERIAL/i.test(c.type)) return;
        insertCols.push(c.name);
        if (c.name === "_dh_loaded_at") {
          selectExprs.push("CURRENT_TIMESTAMP");
        } else if (c.name === "_dh_source_system") {
          selectExprs.push(sourceSystemLit);
        } else         if (c.name === "customer_key") {
          selectExprs.push("c." + quoteModelIdent("customer_key"));
        } else if (c.name === "date_key") {
          selectExprs.push(dateKeyExpr);
        } else if (c.name === "geo_key") {
          selectExprs.push("g." + quoteModelIdent("geo_key"));
        } else if (c.name === "channel_key") {
          selectExprs.push("ch." + quoteModelIdent("channel_key"));
        } else if (c.name === "product_key") {
          selectExprs.push("pr." + quoteModelIdent("product_key"));
        } else {
          selectExprs.push(modelCastExpr(c, platform));
        }
      });

      lines.push(
        "INSERT INTO " + modelFqName(target, p.name),
        "  (" + insertCols.map(quoteModelIdent).join(", ") + ")",
        "SELECT"
      );
      selectExprs.forEach((expr, idx) => {
        lines.push(
          "  " + expr + " AS " + quoteModelIdent(insertCols[idx]) + (idx < selectExprs.length - 1 ? "," : "")
        );
      });
      lines.push("FROM " + srcFq + " src");
      if (insertCols.indexOf("customer_key") >= 0) {
        const custSrc =
          platform === "snowflake" ? "src." + custCol.toUpperCase() : "src." + custCol;
        lines.push(
          "LEFT JOIN " +
            modelFqName(target, "dim_customer") +
            " c",
          "  ON c." +
            quoteModelIdent("customer_id") +
            " = CAST(" +
            custSrc +
            " AS " +
            types.varchar(64) +
            ")" +
            (selected.some((x) => x.id === "dim_customer")
              ? " AND c." + quoteModelIdent("is_current") + " = TRUE"
              : "")
        );
      }
      if (insertCols.indexOf("geo_key") >= 0 && selected.some((x) => x.id === "dim_geography")) {
        lines.push(
          "LEFT JOIN " + modelFqName(target, "dim_geography") + " g",
          "  ON g." +
            quoteModelIdent("city") +
            " = CAST(src." +
            (platform === "snowflake" ? "CITY" : "city") +
            " AS " +
            types.varchar(128) +
            ")",
          " AND g." +
            quoteModelIdent("state") +
            " = CAST(src." +
            (platform === "snowflake" ? "STATE" : "state") +
            " AS " +
            types.varchar(64) +
            ")"
        );
      }
      if (insertCols.indexOf("channel_key") >= 0 && selected.some((x) => x.id === "dim_channel")) {
        lines.push(
          "LEFT JOIN " + modelFqName(target, "dim_channel") + " ch",
          "  ON ch." +
            quoteModelIdent("channel_code") +
            " = CAST(src." +
            (platform === "snowflake" ? "PREFERRED_CHANNEL" : "preferred_channel") +
            " AS " +
            types.varchar(64) +
            ")"
        );
      }
      if (naturalKey) {
        const nkCol = (p.columns || []).find((c) => c.name === naturalKey);
        const nkExpr = nkCol ? modelCastExpr(nkCol, platform) : "src." + naturalKey;
        lines.push(
          "WHERE NOT EXISTS (",
          "  SELECT 1 FROM " + modelFqName(target, p.name) + " f",
          "  WHERE f." + quoteModelIdent(naturalKey) + " = (" + nkExpr + ")",
          ");"
        );
      } else {
        lines.push(";");
      }
      lines.push("");
    });

  lines.push(
    "-- ------------------------------------------------------------",
    "-- Post-load validation",
    "-- ------------------------------------------------------------"
  );
  selected
    .filter((p) => p.kind === "dimension" || p.kind === "fact")
    .forEach((p) => {
      lines.push(
        "SELECT '" +
          p.name +
          "' AS model_object, COUNT(*) AS row_count FROM " +
          modelFqName(target, p.name) +
          ";"
      );
    });
  lines.push("");
  const firstFact = selected.find((p) => p.kind === "fact");
  if (firstFact && selected.some((p) => p.id === "dim_customer")) {
    lines.push(
      "-- Orphan fact checks (customer_key)",
      "SELECT 'fact_orphans_customer' AS check_name, COUNT(*) AS n",
      "FROM " + modelFqName(target, firstFact.name) + " f",
      "LEFT JOIN " +
        modelFqName(target, "dim_customer") +
        " c ON c." +
        quoteModelIdent("customer_key") +
        " = f." +
        quoteModelIdent("customer_key"),
      "WHERE f." +
        quoteModelIdent("customer_key") +
        " IS NOT NULL AND c." +
        quoteModelIdent("customer_key") +
        " IS NULL;"
    );
  }

  return lines.join("\n");
}

function collectModelScope() {
  const connectorSel = $("#govModelConnector");
  const databaseSel = $("#govModelDatabase");
  const schemaSel = $("#govModelSchema");
  const targetSel = $("#govModelTargetSchema");
  const connectorId = (connectorSel && connectorSel.value) || "";
  const database = (databaseSel && databaseSel.value) || "";
  const schema = (schemaSel && schemaSel.value) || "";
  const targetSchema = ((targetSel && targetSel.value) || "").trim() || "gold";
  const connector = modelState.connectors.find((c) => c.id === connectorId);
  return {
    connectorId,
    connectorName: connector
      ? connector.display_name || connectorId
      : (connectorSel && connectorSel.selectedOptions[0] && connectorSel.selectedOptions[0].textContent) ||
        connectorId,
    database,
    schema,
    targetSchema,
    platform: String((connector && (connector.platform || connector.cloud)) || "postgres").toLowerCase(),
  };
}

function lineageNeighbors(nodeId) {
  const upstream = new Set();
  const downstream = new Set();
  const incoming = {};
  const outgoing = {};
  LINEAGE_GRAPH.edges.forEach(([from, to]) => {
    (outgoing[from] = outgoing[from] || []).push(to);
    (incoming[to] = incoming[to] || []).push(from);
  });
  function walk(start, map, bucket) {
    const stack = [start];
    while (stack.length) {
      const cur = stack.pop();
      (map[cur] || []).forEach((next) => {
        if (!bucket.has(next)) {
          bucket.add(next);
          stack.push(next);
        }
      });
    }
  }
  walk(nodeId, incoming, upstream);
  walk(nodeId, outgoing, downstream);
  return { upstream, downstream };
}

function lineageNodeById(id) {
  return LINEAGE_GRAPH.nodes.find((n) => n.id === id) || null;
}

function updateLineageDetail(nodeId) {
  const el = $("#govLineageDetail");
  if (!el) return;
  if (!nodeId) {
    el.innerHTML = '<span class="muted">Select an asset on the map to inspect its lineage path.</span>';
    return;
  }
  const node = lineageNodeById(nodeId);
  if (!node) return;
  const { upstream, downstream } = lineageNeighbors(nodeId);
  const upNames = [...upstream].map((id) => lineageNodeById(id)?.title).filter(Boolean);
  const downNames = [...downstream].map((id) => lineageNodeById(id)?.title).filter(Boolean);
  el.innerHTML =
    "<strong>" +
    escapeHtml(node.title) +
    "</strong> <span class=\"muted\">· " +
    escapeHtml(node.sub) +
    " · " +
    escapeHtml(LINEAGE_LAYERS[node.layer].label) +
    "</span><br>" +
    "<span class=\"muted\">Upstream:</span> " +
    (upNames.length ? escapeHtml(upNames.join(", ")) : "—") +
    " &nbsp;·&nbsp; <span class=\"muted\">Downstream:</span> " +
    (downNames.length ? escapeHtml(downNames.join(", ")) : "—");
}

function renderLineageMap(selectedId) {
  const svg = $("#govLineageSvg");
  if (!svg) return;

  const nodeW = 168;
  const nodeH = 62;
  const layerOrder = ["source", "bronze", "silver", "gold", "consume"];
  const byLayer = {};
  layerOrder.forEach((layer) => {
    byLayer[layer] = LINEAGE_GRAPH.nodes.filter((n) => n.layer === layer);
  });
  const maxRows = Math.max(...layerOrder.map((l) => byLayer[l].length), 1);
  const topPad = 48;
  const rowGap = 18;
  const totalH = topPad + maxRows * (nodeH + rowGap) + 24;
  const totalW = 1200;
  svg.setAttribute("viewBox", "0 0 " + totalW + " " + totalH);
  svg.style.height = Math.max(480, totalH) + "px";

  const positions = {};
  layerOrder.forEach((layer) => {
    const nodes = byLayer[layer];
    const colH = nodes.length * nodeH + Math.max(0, nodes.length - 1) * rowGap;
    const startY = topPad + (maxRows * (nodeH + rowGap) - rowGap - colH) / 2;
    nodes.forEach((node, idx) => {
      positions[node.id] = {
        x: LINEAGE_LAYERS[layer].x,
        y: startY + idx * (nodeH + rowGap),
        cx: LINEAGE_LAYERS[layer].x + nodeW,
        cy: startY + idx * (nodeH + rowGap) + nodeH / 2,
        lx: LINEAGE_LAYERS[layer].x,
        ly: startY + idx * (nodeH + rowGap) + nodeH / 2,
      };
    });
  });

  let related = null;
  if (selectedId) {
    const nbr = lineageNeighbors(selectedId);
    related = new Set([selectedId, ...nbr.upstream, ...nbr.downstream]);
  }

  const edgePaths = LINEAGE_GRAPH.edges
    .map(([from, to], i) => {
      const a = positions[from];
      const b = positions[to];
      if (!a || !b) return "";
      const midX = (a.cx + b.lx) / 2;
      const d =
        "M" +
        a.cx +
        "," +
        a.cy +
        " C" +
        midX +
        "," +
        a.cy +
        " " +
        midX +
        "," +
        b.ly +
        " " +
        b.lx +
        "," +
        b.ly;
      let cls = "edge";
      if (related) {
        cls = related.has(from) && related.has(to) ? "edge active" : "edge dim";
      }
      return '<path class="' + cls + '" data-edge="' + i + '" d="' + d + '" />';
    })
    .join("");

  const colLabels = layerOrder
    .map((layer) => {
      const x = LINEAGE_LAYERS[layer].x + nodeW / 2;
      return (
        '<text class="col-label" text-anchor="middle" x="' +
        x +
        '" y="28">' +
        LINEAGE_LAYERS[layer].label +
        "</text>"
      );
    })
    .join("");

  const nodeMarkup = LINEAGE_GRAPH.nodes
    .map((node) => {
      const p = positions[node.id];
      const color = LINEAGE_LAYERS[node.layer].color;
      let cls = "node";
      if (selectedId) {
        if (node.id === selectedId) cls += " selected";
        else if (related && related.has(node.id)) cls += " active";
        else cls += " dim";
      }
      return (
        '<g class="' +
        cls +
        '" data-node-id="' +
        escapeHtml(node.id) +
        '" transform="translate(' +
        p.x +
        "," +
        p.y +
        ')">' +
        '<rect width="' +
        nodeW +
        '" height="' +
        nodeH +
        '"></rect>' +
        '<rect x="0" y="0" width="5" height="' +
        nodeH +
        '" rx="2" fill="' +
        color +
        '" stroke="none"></rect>' +
        '<text class="layer" x="16" y="20" fill="' +
        color +
        '">' +
        escapeHtml(LINEAGE_LAYERS[node.layer].label) +
        "</text>" +
        '<text class="title" x="16" y="38">' +
        escapeHtml(node.title) +
        "</text>" +
        '<text class="sub" x="16" y="53">' +
        escapeHtml(node.sub) +
        "</text>" +
        "</g>"
      );
    })
    .join("");

  svg.innerHTML =
    '<defs><marker id="linArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">' +
    '<path d="M 0 0 L 10 5 L 0 10 z" fill="#c5cedd"></path></marker>' +
    '<marker id="linArrowActive" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">' +
    '<path d="M 0 0 L 10 5 L 0 10 z" fill="#FF671F"></path></marker></defs>' +
    colLabels +
    '<g class="edges">' +
    edgePaths +
    "</g><g class=\"nodes\">" +
    nodeMarkup +
    "</g>";

  // Apply arrow markers
  svg.querySelectorAll(".edge").forEach((path) => {
    path.setAttribute(
      "marker-end",
      path.classList.contains("active") ? "url(#linArrowActive)" : "url(#linArrow)"
    );
  });

  updateLineageDetail(selectedId || null);
}

function bindGovernanceEvents() {
  if (govBound) return;
  govBound = true;

  const view = $("#view-governance");
  if (!view) return;

  view.addEventListener("click", (e) => {
    const tile = e.target.closest(".gov-tile");
    if (tile && tile.dataset.gov === "data-quality") {
      e.preventDefault();
      showDataQuality().catch((err) => console.warn("[dq]", err));
      return;
    }
    if (tile && tile.dataset.gov === "data-lineage") {
      e.preventDefault();
      showLineageMap().catch((err) => console.warn("[lineage]", err));
      return;
    }
    if (tile && tile.dataset.gov === "data-modeling") {
      e.preventDefault();
      showDataModeling();
      return;
    }
    const backLineage = e.target.closest("#govLineageBackBtn");
    if (backLineage) {
      e.preventDefault();
      showGovernanceHome();
      return;
    }
    const backModel = e.target.closest("#govModelBackBtn");
    if (backModel) {
      e.preventDefault();
      showGovernanceHome();
      return;
    }
    const backDq = e.target.closest("#govDqBackBtn");
    if (backDq) {
      e.preventDefault();
      showGovernanceHome();
      return;
    }
    const node = e.target.closest(".node");
    if (node && node.dataset.nodeId) {
      lineageSelectedId =
        lineageSelectedId === node.dataset.nodeId ? null : node.dataset.nodeId;
      renderLineageMap(lineageSelectedId);
    }
  });

  const lineageConnectorSel = $("#govLineageConnector");
  if (lineageConnectorSel) {
    lineageConnectorSel.addEventListener("change", () => {
      onLineageConnectorChange().catch((err) => console.warn("[lineage]", err));
    });
  }
  const lineageScopeSel = $("#govLineageScope");
  if (lineageScopeSel) {
    lineageScopeSel.addEventListener("change", () => onLineageScopeChange());
  }

  const dqConnectorSel = $("#govDqConnector");
  if (dqConnectorSel) {
    dqConnectorSel.addEventListener("change", () => {
      onDqConnectorChange().catch((err) => console.warn("[dq]", err));
    });
  }
  const dqSchemaSel = $("#govDqSchema");
  if (dqSchemaSel) {
    dqSchemaSel.addEventListener("change", () => {
      onDqSchemaChange().catch((err) => console.warn("[dq]", err));
    });
  }
  const dqRunBtn = $("#govDqRunBtn");
  if (dqRunBtn) {
    dqRunBtn.addEventListener("click", () => {
      runDataQualityChecks().catch((err) => console.warn("[dq]", err));
    });
  }

  const connectorSel = $("#govModelConnector");
  if (connectorSel) {
    connectorSel.addEventListener("change", () => onModelConnectorChange());
  }
  const databaseSel = $("#govModelDatabase");
  if (databaseSel) {
    databaseSel.addEventListener("change", () => {
      filterModelSchemasForDatabase(databaseSel.value);
    });
  }

  const proposeBtn = $("#govModelProposeBtn");
  if (proposeBtn) {
    proposeBtn.addEventListener("click", async () => {
      const scope = collectModelScope();
      if (!scope.connectorId) return showModelError("Select a connector.");
      if (!scope.database) return showModelError("Select a database / layer.");
      if (!scope.schema) return showModelError("Select a schema.");
      if (!scope.targetSchema) return showModelError("Select a target model schema.");
      showModelError("");
      proposeBtn.disabled = true;
      const prevLabel = proposeBtn.textContent;
      proposeBtn.textContent = "Analyzing source…";
      try {
        let proposal = proposeDimensionalModel(scope);
        proposal = await enrichProposalFromSourceStructures(scope, proposal);
        modelState.proposal = proposal;
        renderModelProposal();
        setModelStep(2);
      } catch (err) {
        showModelError(err && err.message ? err.message : String(err));
      } finally {
        proposeBtn.disabled = false;
        proposeBtn.textContent = prevLabel || "Propose data model";
      }
    });
  }

  const proposalList = $("#govModelProposalList");
  if (proposalList) {
    proposalList.addEventListener("change", (e) => {
      const input = e.target.closest("input[data-model-obj]");
      if (!input) return;
      const id = input.getAttribute("data-model-obj");
      const item = modelState.proposal.find((p) => p.id === id);
      if (item) item.selected = !!input.checked;
      renderModelProposal();
    });
  }

  const backScope = $("#govModelBackToScopeBtn");
  if (backScope) {
    backScope.addEventListener("click", () => setModelStep(1));
  }
  const backProposal = $("#govModelBackToProposalBtn");
  if (backProposal) {
    backProposal.addEventListener("click", () => setModelStep(2));
  }

  const confirmBtn = $("#govModelConfirmBtn");
  if (confirmBtn) {
    confirmBtn.addEventListener("click", () => {
      const selected = (modelState.proposal || []).filter((p) => p.selected);
      if (!selected.length) {
        showModelError("Select at least one dimension, fact, or view.");
        setModelStep(2);
        return;
      }
      const scope = collectModelScope();
      modelState.ddl = generateModelDdl(modelState.proposal, scope);
      modelState.ingest = generateModelIngestionScript(modelState.proposal, scope);
      recordModelLineage(modelState.proposal, scope);
      const editor = $("#govModelDdlEditor");
      if (editor) editor.value = modelState.ddl;
      const ingestEditor = $("#govModelIngestEditor");
      if (ingestEditor) ingestEditor.value = modelState.ingest;
      setModelStep(3);
    });
  }

  async function copyModelScript(sel) {
    const el = $(sel);
    const text = (el && el.value) || "";
    if (!text.trim()) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch (_err) {
      if (el) {
        el.select();
        document.execCommand("copy");
      }
    }
  }

  function downloadModelScript(sel, suffix) {
    const text = (($(sel) && $(sel).value) || "").trim();
    if (!text) return;
    const scope = collectModelScope();
    const name =
      "data_model_" +
      String(scope.targetSchema || "gold").replace(/[^\w\-]+/g, "_") +
      "_" +
      suffix +
      ".sql";
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  const copyDdl = $("#govModelCopyDdlBtn");
  if (copyDdl) copyDdl.addEventListener("click", () => copyModelScript("#govModelDdlEditor"));
  const downloadDdl = $("#govModelDownloadDdlBtn");
  if (downloadDdl) {
    downloadDdl.addEventListener("click", () => downloadModelScript("#govModelDdlEditor", "ddl"));
  }
  const copyIngest = $("#govModelCopyIngestBtn");
  if (copyIngest) {
    copyIngest.addEventListener("click", () => copyModelScript("#govModelIngestEditor"));
  }
  const downloadIngest = $("#govModelDownloadIngestBtn");
  if (downloadIngest) {
    downloadIngest.addEventListener("click", () =>
      downloadModelScript("#govModelIngestEditor", "ingestion")
    );
  }
}

function initGovernanceView() {
  bindGovernanceEvents();
  showGovernanceHome();
  if (window.lucide && typeof lucide.createIcons === "function") {
    lucide.createIcons({ attrs: { "stroke-width": "1.75", "aria-hidden": "true" } });
  }
}
