gogit () {
git add -A
git commit -m $1
for remote in `git remote`; do
git push $remote master
done
}