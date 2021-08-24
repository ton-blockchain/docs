# Comments
FunC has single-line comments, which start with `;;` (double `;`): for example, `int x = 1; ;; assign 2 to x`.

It also has multi-line comments, which start `{-` and end with `-}`. Note that unlike in many other languages, FunC multi-line comments can be nested. For example:
```
{- This is a multi-line comment
    {- this is a comment in the comment -}
-}
```
