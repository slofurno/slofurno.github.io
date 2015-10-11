gogit () {
git add -A
git commit -m $1
for remote in `git remote`; do
echo "git push $remote master"
done

}