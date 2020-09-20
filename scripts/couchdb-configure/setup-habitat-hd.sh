# put export dbs="admin:pasword@localhost:5984" in .profile, . .profile or re-log-in
# then create the hardocs projects database
curl -X PUT $dbs/hardocs-projects

# create design doc with two view

{
  "_id": "_design/projects",
  "_rev": "2-b33ad030c1d8819228056332de560688",
  "views": {
    "owner-projects": {
      "map": "function (doc) {\n  if (doc)\n  emit(doc.owner, 1);\n}"
    },
    "owner-project": {
      "map": "function (doc) {\n  if (doc)\n  emit(doc.owner + ':' + doc.project, 1);\n}"
    }
  },
  "language": "javascript"
}

# all docs
curl $dbs/hardocs-projects/_all_docs?include_docs=true

# all by view
curl $dbs/hardocs-projects/_design/projects/_view/owner-projects/?include_docs=true

# selected by view
curl "$dbs/hardocs-projects/_design/projects/_view/owner-projects?key=%22narreshen%22&include_docs=true"
curl "$dbs/hardocs-projects/_design/projects/_view/owner-projects?include_docs=true&key=%22narreshen%22"

# a single project, with our second view
curl "$dbs/hardocs-projects/_design/projects/_view/owner-project?key=%22narreshen:proj-2%22&wut=wow&include_docs=true"

# and now also create the publicly searchable database, which will contain
# all and only public projects via replication
curl -X PUT $dbs/hardocs-public
curl $dbs/hardocs-public/_all_docs?include_docs=true

# how to compact
curl -u admin-hard:4admin-hard -H "Content-Type: application/json" -X POST  http://localhost:5984/hard-begin/_compact
{"ok":true}

