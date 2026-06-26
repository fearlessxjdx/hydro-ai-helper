<!--
  This file IS the GitHub Release body (the publish workflow reads it via
  body_path). Auto-generation is disabled on purpose. Keep it user-facing and
  update it before each release tag.
-->
## v2.3.0

- 新增更新通道（stable / edge）：版本更新更安全、更可控。默认的 stable 通道只会更新到正式发布版本，即使误点"覆盖更新"也只拿到经过测试的发布版，不会拉取开发中的代码；edge 通道用于维护者的测试实例，跟踪最新开发分支。
- 修复批量总结（教师端）在部分场景下会触发的运行时错误，提升稳定性。
- 其他底层稳定性与可靠性改进。
