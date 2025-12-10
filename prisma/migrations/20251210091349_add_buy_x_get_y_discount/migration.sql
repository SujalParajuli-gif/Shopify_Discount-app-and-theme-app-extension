-- CreateTable
CREATE TABLE "BuyXGetYDiscount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "productXGid" TEXT NOT NULL,
    "productYGid" TEXT NOT NULL,
    "quantityX" INTEGER NOT NULL,
    "quantityY" INTEGER NOT NULL,
    "percentageOff" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
