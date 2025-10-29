-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'MEMBER');

-- CreateTable
CREATE TABLE "categories" (
    "categorycode" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category_type" TEXT NOT NULL DEFAULT 'A',
    "max_checkout_count" INTEGER NOT NULL DEFAULT 5,
    "loan_period_days" INTEGER NOT NULL DEFAULT 14,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("categorycode")
);

-- CreateTable
CREATE TABLE "itemtypes" (
    "itemtype" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "rentalcharge" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "defaultreplacecost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "notforloan" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "itemtypes_pkey" PRIMARY KEY ("itemtype")
);

-- CreateTable
CREATE TABLE "biblio" (
    "biblionumber" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "author" TEXT,
    "isbn" TEXT,
    "publisher" TEXT,
    "publicationyear" INTEGER,
    "itemtype" TEXT,
    "notes" TEXT,
    "abstract" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "biblio_pkey" PRIMARY KEY ("biblionumber")
);

-- CreateTable
CREATE TABLE "items" (
    "itemnumber" SERIAL NOT NULL,
    "biblionumber" INTEGER NOT NULL,
    "barcode" TEXT NOT NULL,
    "itemcallnumber" TEXT,
    "location" TEXT,
    "price" DECIMAL(10,2),
    "replacementprice" DECIMAL(10,2),
    "status" TEXT NOT NULL DEFAULT 'available',
    "status_date" TIMESTAMP(3),
    "notforloan" BOOLEAN NOT NULL DEFAULT false,
    "issues" INTEGER NOT NULL DEFAULT 0,
    "renewals" INTEGER NOT NULL DEFAULT 0,
    "reserves" INTEGER NOT NULL DEFAULT 0,
    "onloan" TIMESTAMP(3),
    "datelastborrowed" TIMESTAMP(3),
    "datelastseen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "items_pkey" PRIMARY KEY ("itemnumber")
);

-- CreateTable
CREATE TABLE "borrowers" (
    "borrowernumber" SERIAL NOT NULL,
    "cardnumber" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "preferred_name" TEXT,
    "dateofbirth" DATE,
    "email" TEXT,
    "phone" TEXT,
    "address" JSONB,
    "categorycode" TEXT NOT NULL,
    "dateenrolled" DATE,
    "dateexpiry" DATE,
    "debarred" DATE,
    "debarred_comment" TEXT,
    "userid" TEXT,
    "password" TEXT NOT NULL,
    "staff_notes" TEXT,
    "lastseen" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "role" "Role" NOT NULL DEFAULT 'MEMBER',

    CONSTRAINT "borrowers_pkey" PRIMARY KEY ("borrowernumber")
);

-- CreateTable
CREATE TABLE "issues" (
    "issue_id" SERIAL NOT NULL,
    "borrowernumber" INTEGER NOT NULL,
    "itemnumber" INTEGER NOT NULL,
    "issuedate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date_due" TIMESTAMP(3) NOT NULL,
    "returndate" TIMESTAMP(3),
    "lastreneweddate" TIMESTAMP(3),
    "renewals_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "issues_pkey" PRIMARY KEY ("issue_id")
);

-- CreateTable
CREATE TABLE "reserves" (
    "reserve_id" SERIAL NOT NULL,
    "borrowernumber" INTEGER NOT NULL,
    "biblionumber" INTEGER NOT NULL,
    "itemnumber" INTEGER,
    "reservedate" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expirationdate" DATE,
    "cancellationdate" DATE,
    "waitingdate" DATE,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "found" VARCHAR(1),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reserves_pkey" PRIMARY KEY ("reserve_id")
);

-- CreateTable
CREATE TABLE "accountlines" (
    "accountlines_id" SERIAL NOT NULL,
    "borrowernumber" INTEGER,
    "itemnumber" INTEGER,
    "issue_id" INTEGER,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "amountoutstanding" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "description" TEXT,
    "accounttype" TEXT,
    "payment_type" TEXT,
    "status" TEXT,
    "manager_id" INTEGER,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "accountlines_pkey" PRIMARY KEY ("accountlines_id")
);

-- CreateTable
CREATE TABLE "systempreferences" (
    "variable" TEXT NOT NULL,
    "value" TEXT,
    "explanation" TEXT,
    "type" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "systempreferences_pkey" PRIMARY KEY ("variable")
);

-- CreateIndex
CREATE UNIQUE INDEX "idx_biblio_isbn" ON "biblio"("isbn");

-- CreateIndex
CREATE UNIQUE INDEX "items_barcode_key" ON "items"("barcode");

-- CreateIndex
CREATE UNIQUE INDEX "borrowers_cardnumber_key" ON "borrowers"("cardnumber");

-- CreateIndex
CREATE UNIQUE INDEX "idx_borrowers_email" ON "borrowers"("email");

-- CreateIndex
CREATE UNIQUE INDEX "idx_borrowers_userid" ON "borrowers"("userid");

-- CreateIndex
CREATE UNIQUE INDEX "issues_itemnumber_key" ON "issues"("itemnumber");

-- AddForeignKey
ALTER TABLE "biblio" ADD CONSTRAINT "biblio_itemtype_fkey" FOREIGN KEY ("itemtype") REFERENCES "itemtypes"("itemtype") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_biblionumber_fkey" FOREIGN KEY ("biblionumber") REFERENCES "biblio"("biblionumber") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "borrowers" ADD CONSTRAINT "borrowers_categorycode_fkey" FOREIGN KEY ("categorycode") REFERENCES "categories"("categorycode") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issues" ADD CONSTRAINT "issues_borrowernumber_fkey" FOREIGN KEY ("borrowernumber") REFERENCES "borrowers"("borrowernumber") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issues" ADD CONSTRAINT "issues_itemnumber_fkey" FOREIGN KEY ("itemnumber") REFERENCES "items"("itemnumber") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reserves" ADD CONSTRAINT "reserves_borrowernumber_fkey" FOREIGN KEY ("borrowernumber") REFERENCES "borrowers"("borrowernumber") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reserves" ADD CONSTRAINT "reserves_biblionumber_fkey" FOREIGN KEY ("biblionumber") REFERENCES "biblio"("biblionumber") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reserves" ADD CONSTRAINT "reserves_itemnumber_fkey" FOREIGN KEY ("itemnumber") REFERENCES "items"("itemnumber") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accountlines" ADD CONSTRAINT "accountlines_borrowernumber_fkey" FOREIGN KEY ("borrowernumber") REFERENCES "borrowers"("borrowernumber") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accountlines" ADD CONSTRAINT "accountlines_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "borrowers"("borrowernumber") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accountlines" ADD CONSTRAINT "accountlines_itemnumber_fkey" FOREIGN KEY ("itemnumber") REFERENCES "items"("itemnumber") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accountlines" ADD CONSTRAINT "accountlines_issue_id_fkey" FOREIGN KEY ("issue_id") REFERENCES "issues"("issue_id") ON DELETE SET NULL ON UPDATE CASCADE;
