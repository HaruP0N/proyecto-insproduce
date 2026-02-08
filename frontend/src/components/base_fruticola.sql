/* =============================================================
   INSPRODUCE - Azure SQL (Versión Corregida)
   Estructura: commodities, users, inspections, photos, pdfs, 
               templates, fields, assignments + Triggers + Vista
   ============================================================= */

SET NOCOUNT ON;
GO

/* 1) COMMODITIES */
IF OBJECT_ID('dbo.commodities','U') IS NULL
BEGIN
  CREATE TABLE dbo.commodities (
    [id] INT IDENTITY(1,1) PRIMARY KEY,
    [code] VARCHAR(50) NOT NULL UNIQUE,
    [name] VARCHAR(100) NOT NULL,
    [active] BIT NOT NULL CONSTRAINT DF_commodities_active DEFAULT 1,
    [created_at] DATETIME2 NOT NULL CONSTRAINT DF_commodities_created DEFAULT SYSUTCDATETIME()
  );
END
GO

IF NOT EXISTS (SELECT 1 FROM dbo.commodities WHERE code='CHERRY')
BEGIN
  INSERT INTO dbo.commodities (code, name, active) VALUES
    ('CHERRY','Cereza',0),
    ('STRAWBERRY','Frutilla',1),
    ('RASPBERRY','Frambuesa',1),
    ('BLACKBERRY','Mora',1),
    ('BLUEBERRY','Arándano',1),
    ('RED_CURRANTS','Red Currants',1);
END
GO

/* 2) USERS */
IF OBJECT_ID('dbo.users','U') IS NULL
BEGIN
  CREATE TABLE dbo.users (
    [id] INT IDENTITY(1,1) PRIMARY KEY,
    [name] VARCHAR(100) NULL,
    [email] VARCHAR(150) NOT NULL,
    [password_hash] VARCHAR(255) NOT NULL,
    [role] VARCHAR(20) NOT NULL,
    [active] BIT NOT NULL CONSTRAINT DF_users_active DEFAULT 1,
    [created_at] DATETIME2 NOT NULL CONSTRAINT DF_users_created DEFAULT SYSUTCDATETIME(),
    [updated_at] DATETIME2 NOT NULL CONSTRAINT DF_users_updated DEFAULT SYSUTCDATETIME(),
    CONSTRAINT UQ_users_email UNIQUE(email),
    CONSTRAINT CK_users_role CHECK ([role] IN ('admin','inspector'))
  );
END
GO

/* Trigger users.updated_at */
IF OBJECT_ID('dbo.trg_users_updated_at', 'TR') IS NOT NULL
    DROP TRIGGER dbo.trg_users_updated_at;
GO
EXEC('
CREATE TRIGGER dbo.trg_users_updated_at
ON dbo.users
AFTER UPDATE AS
BEGIN
  SET NOCOUNT ON;
  UPDATE u SET updated_at = SYSUTCDATETIME()
  FROM dbo.users u
  INNER JOIN inserted i ON i.id = u.id;
END
');
GO

/* 3) INSPECTIONS */
IF OBJECT_ID('dbo.inspections','U') IS NULL
BEGIN
  CREATE TABLE dbo.inspections (
    [id] INT IDENTITY(1,1) PRIMARY KEY,
    [created_at] DATETIME2 NOT NULL CONSTRAINT DF_inspections_created DEFAULT SYSUTCDATETIME(),
    [updated_at] DATETIME2 NOT NULL CONSTRAINT DF_inspections_updated DEFAULT SYSUTCDATETIME(),
    [commodity_id] INT NOT NULL,
    [created_by_user_id] INT NULL,
    [producer] VARCHAR(255) NULL,
    [lot] VARCHAR(80) NULL,
    [variety] VARCHAR(120) NULL,
    [caliber] VARCHAR(50) NULL,
    [packaging_code] VARCHAR(100) NULL,
    [packaging_type] VARCHAR(100) NULL,
    [packaging_date] DATE NULL,
    [net_weight] DECIMAL(10,2) NULL,
    [brix_avg] DECIMAL(6,2) NULL,
    [temp_water] DECIMAL(6,2) NULL,
    [temp_ambient] DECIMAL(6,2) NULL,
    [temp_pulp] DECIMAL(6,2) NULL,
    [notes] NVARCHAR(MAX) NULL,
    [metrics] NVARCHAR(MAX) NOT NULL CONSTRAINT DF_inspections_metrics DEFAULT '{}',
    CONSTRAINT FK_inspections_commodity FOREIGN KEY (commodity_id) REFERENCES dbo.commodities(id),
    CONSTRAINT FK_inspections_created_by FOREIGN KEY (created_by_user_id) REFERENCES dbo.users(id) ON DELETE SET NULL
  );
END
GO

/* Trigger inspections.updated_at */
IF OBJECT_ID('dbo.trg_inspections_updated_at', 'TR') IS NOT NULL
    DROP TRIGGER dbo.trg_inspections_updated_at;
GO
EXEC('
CREATE TRIGGER dbo.trg_inspections_updated_at
ON dbo.inspections
AFTER UPDATE AS
BEGIN
  SET NOCOUNT ON;
  UPDATE t SET updated_at = SYSUTCDATETIME()
  FROM dbo.inspections t
  INNER JOIN inserted i ON i.id = t.id;
END
');
GO

/* Índices Inspecciones */
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='idx_inspections_created_at' AND object_id=OBJECT_ID('dbo.inspections'))
  CREATE NONCLUSTERED INDEX idx_inspections_created_at ON dbo.inspections(created_at DESC);
GO

/* 4) INSPECTION_PHOTOS */
IF OBJECT_ID('dbo.inspection_photos','U') IS NULL
BEGIN
  CREATE TABLE dbo.inspection_photos (
    [id] INT IDENTITY(1,1) PRIMARY KEY,
    [inspection_id] INT NOT NULL,
    [url] NVARCHAR(MAX) NOT NULL,
    [label] VARCHAR(100) NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT DF_photos_created DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_photos_inspection FOREIGN KEY (inspection_id) REFERENCES dbo.inspections(id) ON DELETE CASCADE
  );
END
GO

/* 5) INSPECTION_PDFS */
IF OBJECT_ID('dbo.inspection_pdfs','U') IS NULL
BEGIN
  CREATE TABLE dbo.inspection_pdfs (
    [inspection_id] INT NOT NULL PRIMARY KEY,
    [status] VARCHAR(20) NOT NULL CONSTRAINT DF_pdfs_status DEFAULT 'PENDING',
    [pdf_url] NVARCHAR(MAX) NULL,
    [pdf_hash] VARCHAR(128) NULL,
    [updated_at] DATETIME2 NULL,
    [error_message] NVARCHAR(MAX) NULL,
    CONSTRAINT CK_pdfs_status CHECK ([status] IN ('PENDING','OK','ERROR')),
    CONSTRAINT FK_pdfs_inspection FOREIGN KEY (inspection_id) REFERENCES dbo.inspections(id) ON DELETE CASCADE
  );
END
GO

/* 6) METRIC_TEMPLATES + METRIC_FIELDS */
IF OBJECT_ID('dbo.metric_templates','U') IS NULL
BEGIN
  CREATE TABLE dbo.metric_templates (
    [id] INT IDENTITY(1,1) PRIMARY KEY,
    [commodity_id] INT NOT NULL,
    [version] INT NOT NULL CONSTRAINT DF_templates_version DEFAULT 1,
    [name] VARCHAR(120) NOT NULL,
    [active] BIT NOT NULL CONSTRAINT DF_templates_active DEFAULT 1,
    [created_at] DATETIME2 NOT NULL CONSTRAINT DF_templates_created DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_templates_commodity FOREIGN KEY (commodity_id) REFERENCES dbo.commodities(id) ON DELETE CASCADE,
    CONSTRAINT UQ_templates_commodity_version UNIQUE (commodity_id, [version])
  );
END
GO

IF OBJECT_ID('dbo.metric_fields','U') IS NULL
BEGIN
  CREATE TABLE dbo.metric_fields (
    [id] INT IDENTITY(1,1) PRIMARY KEY,
    [template_id] INT NOT NULL,
    [key] VARCHAR(80) NOT NULL,
    [label] VARCHAR(120) NOT NULL,
    [field_type] VARCHAR(20) NOT NULL,
    [required] BIT NOT NULL CONSTRAINT DF_fields_required DEFAULT 0,
    [unit] VARCHAR(20) NULL,
    [min_value] DECIMAL(18,2) NULL,
    [max_value] DECIMAL(18,2) NULL,
    [options] NVARCHAR(MAX) NOT NULL CONSTRAINT DF_fields_options DEFAULT '[]',
    [order_index] INT NOT NULL CONSTRAINT DF_fields_order DEFAULT 0,
    CONSTRAINT FK_fields_template FOREIGN KEY (template_id) REFERENCES dbo.metric_templates(id) ON DELETE CASCADE,
    CONSTRAINT UQ_fields_template_key UNIQUE (template_id, [key]),
    CONSTRAINT CK_fields_type CHECK (field_type IN ('number','text','select','boolean'))
  );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='idx_fields_template_order' AND object_id=OBJECT_ID('dbo.metric_fields'))
  CREATE NONCLUSTERED INDEX idx_fields_template_order ON dbo.metric_fields(template_id, [order_index]);
GO

/* 7) ASSIGNMENTS */
IF OBJECT_ID('dbo.assignments','U') IS NULL
BEGIN
  CREATE TABLE dbo.assignments (
    [id] INT IDENTITY(1,1) PRIMARY KEY,
    [user_id] INT NOT NULL,
    [producer] VARCHAR(100) NULL,
    [lot] VARCHAR(50) NOT NULL,
    [variety] VARCHAR(50) NULL,
    [status] VARCHAR(20) NOT NULL CONSTRAINT DF_assign_status DEFAULT 'pendiente',
    [created_at] DATETIME2 NOT NULL CONSTRAINT DF_assign_created DEFAULT SYSUTCDATETIME(),
    [notes_admin] NVARCHAR(MAX) NULL,
    CONSTRAINT FK_assign_user FOREIGN KEY (user_id) REFERENCES dbo.users(id),
    CONSTRAINT CK_assign_status CHECK ([status] IN ('pendiente','completada'))
  );
END
GO

/* 8) VISTA PARA PANEL */
IF OBJECT_ID('dbo.vw_inspections_admin','V') IS NOT NULL
    DROP VIEW dbo.vw_inspections_admin;
GO
EXEC('
CREATE VIEW dbo.vw_inspections_admin AS
SELECT
  i.id,
  i.created_at,
  i.updated_at,
  i.producer,
  i.lot,
  i.variety,
  i.caliber,
  i.packaging_code,
  i.packaging_type,
  i.packaging_date,
  i.net_weight,
  i.brix_avg,
  i.temp_water,
  i.temp_ambient,
  i.temp_pulp,
  i.notes,
  i.metrics,
  i.created_by_user_id,
  c.code AS commodity_code,
  c.name AS commodity_name,
  p.status AS pdf_status,
  p.pdf_url,
  p.pdf_hash
FROM dbo.inspections i
JOIN dbo.commodities c ON c.id = i.commodity_id
LEFT JOIN dbo.inspection_pdfs p ON p.inspection_id = i.id;
');
GO