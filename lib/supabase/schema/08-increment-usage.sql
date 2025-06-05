create or replace function public.increment_words_used(
  uid uuid,
  add_words int
) returns void
language plpgsql
as $$
begin
  update public.profiles
  set words_used = words_used + add_words
  where id = uid
    and (words_used + add_words) <= words_limit;
  
  if not found then
    raise exception 'limit-reached';
  end if;
end;
$$; 