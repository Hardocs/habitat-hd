# put export dbs="admin:pasword@localhost:5984" in .profile, . .profile or re-log-in
# then create the hardocs projects database
curl -X PUT $dbs/hardocs-projects

# create basis view

{
  "_id": "_design/projects",
  "views": {
    "owner-projects": {
      "map": "function (doc) {\n  if (doc)\n  emit(doc.owner, 1);\n}"
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
