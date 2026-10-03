SQL_SCHEMA = r'''
create extension if not exists vector;

create table if not exists documents (
    id text primary key,
    user_id uuid null,
    filename text not null,
    original_filename text,
    extension text,
    mime_type text,
    size_bytes bigint not null default 0,
    sha256 text not null,
    status text not null default 'queued',
    pages integer not null default 0,
    analysis jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists documents_user_id_idx on documents(user_id);
create index if not exists documents_created_at_idx on documents(created_at desc);
create index if not exists documents_sha256_idx on documents(sha256);

create table if not exists document_pages (
    id bigserial primary key,
    document_id text not null references documents(id) on delete cascade,
    page integer not null,
    text text not null default '',
    characters integer not null default 0,
    words integer not null default 0,
    ocr boolean not null default false,
    metadata jsonb not null default '{}'::jsonb,
    unique(document_id, page)
);
create index if not exists document_pages_document_id_idx on document_pages(document_id);

create table if not exists document_chunks (
    id bigserial primary key,
    document_id text not null references documents(id) on delete cascade,
    chunk_id text not null,
    page_start integer not null,
    page_end integer not null,
    text text not null,
    token_count integer not null default 0,
    metadata jsonb not null default '{}'::jsonb,
    unique(document_id, chunk_id)
);
create index if not exists document_chunks_document_id_idx on document_chunks(document_id);

create table if not exists document_entities (
    id bigserial primary key,
    document_id text not null references documents(id) on delete cascade,
    type text not null,
    value text not null,
    page integer,
    evidence text,
    confidence numeric,
    metadata jsonb not null default '{}'::jsonb
);
create index if not exists document_entities_document_id_idx on document_entities(document_id);

create table if not exists document_risks (
    id bigserial primary key,
    document_id text not null references documents(id) on delete cascade,
    level text not null,
    title text,
    description text,
    page integer,
    evidence text,
    confidence numeric,
    source text not null default 'deterministic',
    metadata jsonb not null default '{}'::jsonb
);
create index if not exists document_risks_document_id_idx on document_risks(document_id);

create table if not exists document_clauses (
    id bigserial primary key,
    document_id text not null references documents(id) on delete cascade,
    type text not null,
    title text,
    text text not null,
    page integer,
    confidence numeric,
    risk_level text,
    metadata jsonb not null default '{}'::jsonb
);
create index if not exists document_clauses_document_id_idx on document_clauses(document_id);

create table if not exists document_financials (
    id bigserial primary key,
    document_id text not null references documents(id) on delete cascade,
    value text not null,
    currency text,
    amount numeric,
    page integer,
    evidence text,
    confidence numeric,
    metadata jsonb not null default '{}'::jsonb
);
create index if not exists document_financials_document_id_idx on document_financials(document_id);

create table if not exists document_timeline (
    id bigserial primary key,
    document_id text not null references documents(id) on delete cascade,
    date_value text,
    event text not null,
    page integer,
    evidence text,
    confidence numeric,
    metadata jsonb not null default '{}'::jsonb
);
create index if not exists document_timeline_document_id_idx on document_timeline(document_id);

create table if not exists document_embeddings (
    id bigserial primary key,
    document_id text not null references documents(id) on delete cascade,
    chunk_id text not null,
    embedding vector(1536),
    created_at timestamptz not null default now(),
    unique(document_id, chunk_id)
);
create index if not exists document_embeddings_document_id_idx on document_embeddings(document_id);

create table if not exists analysis_jobs (
    job_id text primary key,
    document_id text,
    user_id uuid,
    status text not null,
    progress integer not null default 0,
    stage text not null default 'queued',
    error text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
create index if not exists analysis_jobs_user_id_idx on analysis_jobs(user_id);
create index if not exists analysis_jobs_document_id_idx on analysis_jobs(document_id);
'''
