variable "linked_project_id" {
  type = string
}

variable "linked_project_org_id" {
  type = string
}

variable "db_password" {
  type = string
}

import {
  to = supabase_project.supatennis
  id = var.linked_project_id
}

resource "supabase_project" "supatennis" {
  organization_id   = var.linked_project_org_id
  name              = "supatennis"
  database_password = var.db_password
  region            = "ap-southeast-1"

  lifecycle {
    ignore_changes = [database_password]
  }
}
