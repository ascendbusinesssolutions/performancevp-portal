-- Confirms the pgTAP harness itself runs: the extension is present and a trivial assertion passes.
begin;

select plan(2);

select has_extension('pgtap', 'pgTAP is installed');
select pass('the database test harness runs');

select * from finish();

rollback;
