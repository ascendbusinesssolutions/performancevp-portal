/**
 * Copy for the directory: the template's headers and guidance, the upload's validation messages and
 * the difference preview (PORTAL_COPY_SPEC.md S3). The headers are the Online Measurement
 * Specification 6.1 fields in order; the 12-month rule follows Part 6.4. Drafted for Michael's
 * review with the copy module.
 */
export const directoryCopy = {
  "header.employee_ref": "Employee ID",
  "header.first_name": "First name",
  "header.last_name": "Last name",
  "header.work_email": "Work email",
  "header.unit_code": "Unit code",
  "header.unit_name": "Unit name",
  "header.team_name": "Team",
  "header.manager_ref": "Manager's employee ID",
  "header.role_title": "Role title",
  "header.role_family_name": "Role family",
  "header.start_date": "Start date",
  "header.fte": "FTE fraction",
  "header.is_team_leader": "Team leader",
  "header.is_leadership_team": "Leadership team",
  "header.employment_status": "Employment status",
  "header.formal_rating_label": "Formal performance rating",
  "header.formal_rating_date": "Formal rating date",

  "guidance.title": "PerformanceVP directory template",
  "guidance.intro":
    "One row per person. The file is the whole directory: anyone missing from it is deactivated when it is applied, and nothing changes until you review the differences and apply them.",
  "guidance.required":
    "Required at upload: Employee ID, first and last name, unit code and unit name, and FTE fraction.",
  "guidance.employee_ref":
    "Your employee ID, the key every upload is matched on. Keep it the same from one upload to the next. Enter it as text so leading zeros are kept.",
  "guidance.first_name": "Required.",
  "guidance.last_name": "Required.",
  "guidance.work_email": "Used for survey invitations and, for managers, to sign in.",
  "guidance.unit_code":
    "Required. A code that stays the same when the unit is renamed. A new code creates a new unit.",
  "guidance.unit_name":
    "Required. Changing the name under the same code renames the unit and keeps its history.",
  "guidance.team_name": "The team within the unit, where the unit has teams.",
  "guidance.manager_ref":
    "The employee ID of the person's manager, who must also be in this file. Blank for the top of the organisation.",
  "guidance.role_title": "As your organisation writes it.",
  "guidance.role_family_name": "The role family the person's skills are rated against.",
  "guidance.start_date":
    "The date the person started with the organisation, as a date or written YYYY-MM-DD.",
  "guidance.fte": "Required. Between 0 and 1: 1 is full time, 0.6 is three days a week.",
  "guidance.is_team_leader": "Y for team leaders, otherwise blank.",
  "guidance.is_leadership_team":
    "Y for the members of the unit's leadership team, otherwise blank.",
  "guidance.employment_status": "As your organisation records it.",
  "guidance.formal_rating_label":
    "Optional. The person's most recent formal performance rating, in your organisation's own words. Give its date as well.",
  "guidance.formal_rating_date":
    "The date of that rating. A formal rating is used only if its date is within the 12 months before a campaign launches. If current formal ratings cover at least 80% of a unit, they are used for its talent density and its managers do not rate it; otherwise its managers rate.",
  "guidance.version": "Template version",

  "error.fileTooLarge":
    "The file is larger than 4 MB. Remove other sheets and formatting and upload it again; the directory has to be one file.",
  "error.notXlsx":
    "This is not an Excel workbook (.xlsx). Download the template and save it as an Excel workbook.",
  "error.encrypted":
    "The workbook is password-protected. Save a copy without a password and upload that.",
  "error.unsafe":
    "The workbook contains macros, external links or embedded objects. Save it as a plain Excel workbook (.xlsx) and upload again.",
  "error.malformed":
    "The workbook could not be read. Download the template again and copy your data into it.",
  "error.noSheet":
    "The workbook has no Directory sheet. Download the template again and copy your data into it.",
  "error.headers":
    "The header row does not match the template. Download the template again and keep its first row as it is.",
  "error.tooManyRows": "The file has more than 20,000 rows. Contact PerformanceVP.",
  "error.empty": "The file has no people in it.",
  "error.required": "Required.",
  "error.idNumber":
    "Enter IDs as text. Excel may have removed leading zeros from this number: format the column as text and enter the IDs again.",
  "error.tooLong": "Too long.",
  "error.email": "Not a valid email address.",
  "error.unitCode": "Use letters, numbers, dots, dashes and underscores only, up to 40 characters.",
  "error.date": "Enter a date, or write it as YYYY-MM-DD.",
  "error.fte": "Enter a number above 0 and at most 1.",
  "error.flag": "Enter Y, or leave it blank.",
  "error.ratingPair": "Give the formal rating and its date together.",
  "error.ratingFuture": "The rating date is in the future.",
  "error.duplicateId": "This employee ID appears on an earlier row.",
  "error.serverFailed":
    "The file could not be checked. Try again, and contact PerformanceVP if it happens again.",

  // Problems found across rows or against the live directory, reported by the database at staging.
  "problem.managerMissing": "The manager's employee ID is not in this file.",
  "problem.selfManager": "A person cannot be their own manager.",
  "problem.duplicateEmail": "This work email appears on more than one row.",
  "problem.retiredUnit": "This unit code belongs to a retired unit and cannot be reused.",
  "problem.loop": "This reporting line loops back to the same person.",

  "page.title": "Directory",
  "page.intro":
    "Download the template, fill it from your HR system and upload it. Nothing changes until you review the differences and apply them.",
  "page.template": "Download the template",
  "page.upload": "Upload a directory",
  "page.uploading": "Checking the file",
  "page.choose": "Choose the file",
  "page.active": "active",
  "page.inactive": "deactivated, purged 30 days after deactivation",
  "page.uploads": "Recent uploads",
  "page.noUploads": "No uploads yet.",
  "page.col.file": "File",
  "page.col.rows": "Rows",
  "page.col.status": "Status",
  "page.col.when": "Uploaded",
  "page.col.id": "Employee ID",
  "page.col.name": "Name",
  "page.col.unit": "Unit",
  "page.col.manager": "Manager",
  "page.col.fte": "FTE",
  "page.rejected": "The file was not staged. Fix these rows and upload it again.",
  "page.errorRow": "Row",
  "page.review": "Review the differences",
  "page.nav": "Directory",
  "page.people": "People",
  "page.noPeople": "No one is in the directory yet.",
  "page.listLimit": "The first 200 active people by employee ID are shown.",
  "page.fileLimit": "Excel workbook (.xlsx), up to 4 MB.",
  "page.fileFirst": "Choose a file first.",
  "status.staged": "Awaiting review",
  "status.rejected": "Not accepted",
  "status.applied": "Applied",
  "status.discarded": "Discarded",
  "status.expired": "Expired unreviewed",

  // PORTAL_COPY_SPEC.md S3.
  "preview.title": "Review the differences",
  "preview.joiners": "Joiners",
  "preview.returning": "Returning",
  "preview.leavers": "Leavers",
  "preview.moves": "Moved unit or team",
  "preview.managers": "New manager",
  "preview.updates": "Details changed",
  "preview.ratings": "Formal ratings changed",
  "preview.newUnits": "New units",
  "preview.renamedUnits": "Renamed units",
  "preview.emptiedUnits": "Units left with no staff",
  "preview.newTeams": "New teams",
  "preview.newFamilies": "New role families",
  "preview.nothingChanges": "Nothing changes until you apply.",
  "preview.leaversNote":
    "Leavers are deactivated, not deleted. Their records are purged 30 days later.",
  "preview.snapshotNote": "A running campaign keeps the directory it started with.",
  "preview.emptiedNote":
    "A unit left with no staff stays until you record a merge or split for it.",
  "preview.confirmLeavers": "This file is the whole directory, and these people have left.",
  "preview.leaversWarning":
    "This upload deactivates many people. Confirm the file is the whole directory before applying it.",
  "preview.entitlement": "Active people after this upload",
  "preview.band": "Subscription band allows up to",
  "preview.apply": "Apply the changes",
  "preview.discard": "Discard this upload",
  "preview.applied": "Applied. The directory now matches the file.",
  "preview.stale":
    "The directory changed after this preview was shown. Review it again before applying.",
  "preview.noLongerStaged": "This upload is no longer awaiting review.",
  "preview.discarded": "The upload was discarded. The directory is unchanged.",
  "preview.back": "Back to the directory",
  "preview.summary": "Summary",
  "preview.people": "People",
  "preview.units": "Units, teams and role families",
  "preview.noPeopleChanges": "No one joins, leaves or changes.",
  "preview.unit.new": "New unit",
  "preview.unit.renamed": "Renamed",
  "preview.unit.emptied": "Left with no staff",
  "preview.team": "New team in",
  "preview.family": "New role family",
  "preview.noBand": "No subscription band is recorded for this organisation.",
  "preview.overBand":
    "This is more than the subscription band allows. PerformanceVP will contact you about the band; the upload can still be applied.",
  "preview.blank": "blank",
  "preview.yes": "Yes",
  "preview.no": "No",
  "preview.col.person": "Person",
  "preview.col.change": "Change",
  "preview.change.joiner": "Joins",
  "preview.change.returning": "Returns",
  "preview.change.leaver": "Leaves",
  "preview.change.update": "Changes",
  "preview.from": "from",
  "preview.to": "to",
  "preview.field.first_name": "First name",
  "preview.field.last_name": "Last name",
  "preview.field.work_email": "Work email",
  "preview.field.unit": "Unit",
  "preview.field.team": "Team",
  "preview.field.manager": "Manager",
  "preview.field.role_title": "Role title",
  "preview.field.role_family": "Role family",
  "preview.field.start_date": "Start date",
  "preview.field.fte": "FTE",
  "preview.field.team_leader": "Team leader",
  "preview.field.leadership_team": "Leadership team",
  "preview.field.employment_status": "Employment status",
  "preview.field.formal_rating": "Formal rating",
} as const;

export type DirectoryCopyKey = keyof typeof directoryCopy;
